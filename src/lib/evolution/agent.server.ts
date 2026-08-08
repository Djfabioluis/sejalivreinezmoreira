import { NormalizedEvolutionMessage } from "./types";
import { logEvent } from "./logger.server";
import { extractMessageText } from "./message-text";
import { normalizePhone, buildConversationKey } from "./contact";

export async function findAgentByInstance(instance: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  const { data, error } = await supabaseAdmin
    .from("wa_agentes" as never)
    .select("id, status, unidade_id")
    .eq("instancia", instance)
    .maybeSingle();

  if (error) {
    await logEvent({ 
      instance, 
      event: "agent_lookup", 
      status: "error", 
      errorDetail: error.message 
    });
    return null;
  }

  if (!data) {
    await logEvent({ 
      instance, 
      event: "agent_lookup", 
      status: "agent_not_found" 
    });
    return null;
  }

  const agent = data as any;
  if (!agent.unidade_id) {
    await logEvent({ 
      instance, 
      event: "agent_lookup", 
      status: "agent_without_unit" 
    });
  }

  return agent;
}

export function isIAEnabled(agent: any): boolean {
  if (!agent) return false;
  
  // Normalização de status conforme especificação
  const status = String(agent.status || "").toLowerCase().trim();
  const blockedStates = ["inativo", "inactive", "disabled", "desativado", "false"];
  const isBlocked = blockedStates.includes(status);
  
  // Libera se não estiver explicitamente bloqueado e tiver unidade
  return !isBlocked && !!agent.unidade_id;
}

export async function runAgentFlow(msg: NormalizedEvolutionMessage, textOverride?: string) {
  const messageId = msg.messageId;
  const instance = msg.instance;
  const traceId = (msg as any)._traceId || `${instance}:${messageId}`;
  const fromMe = (msg as any).fromMe === true;

  await logEvent({
    instance,
    messageId,
    event: "WHATSAPP_WEBHOOK_RECEIVED",
    status: "success",
    payload: { 
      traceId, 
      fromMe,
      remoteJid: msg.remoteJid,
      instanceName: instance,
      messageIdInbound: messageId
    }
  });

  try {
    const text = textOverride?.trim() || extractMessageText(msg.message);
    await logEvent({
      instance,
      messageId,
      event: "MESSAGE_PARSED",
      status: "success",
      payload: { traceId, textSnippet: text?.slice(0, 50) }
    });

    const agent = await findAgentByInstance(instance);
    
    await logEvent({
      instance,
      messageId,
      event: "AGENT_RESOLVED_FROM_INSTANCE",
      status: agent ? "success" : "failed",
      payload: { 
        traceId, 
        instanceName: instance,
        agentId: agent?.id,
        agentName: agent?.nome || agent?.name || "Julia",
        unitId: agent?.unidade_id,
        aiEnabled: isIAEnabled(agent)
      }
    });

    const contactPhone = normalizePhone(msg.remoteJid);
    const conversationKey = buildConversationKey(instance, msg.remoteJid);
    
    await logEvent({
      instance,
      messageId,
      event: "CONVERSATION_RESOLVED",
      status: "success",
      payload: { traceId, conversationKey, contactPhone }
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { HUMAN_TAKEOVER_TIMEOUT_MINUTES } = await import("../config");

    // BUSCA CONVERSA PARA CHECAR ATTENDANCE MODE
    const { data: conversation } = await supabaseAdmin
      .from("wa_conversas" as any)
      .select("id, messages, customer_context, contact_name, attendance_mode, human_takeover_at")
      .or(`phone.eq.${conversationKey},phone.eq.${contactPhone},phone_number.eq.${contactPhone}`)
      .maybeSingle();

    const conv = conversation as any;

    if (conv?.attendance_mode === "HUMAN") {
      await logEvent({
        instance,
        messageId,
        event: "ATTENDANCE_MODE_CHECKED",
        status: "success",
        payload: { traceId, mode: "HUMAN", human_takeover_at: conv.human_takeover_at }
      });

      const takeoverAtStr = conv.human_takeover_at;
      const takeoverAt = takeoverAtStr ? new Date(takeoverAtStr).getTime() : 0;
      const now = Date.now();
      
      const diffMs = now - takeoverAt;
      const minutesSinceTakeover = diffMs / 60000;

      if (takeoverAt > 0 && minutesSinceTakeover < HUMAN_TAKEOVER_TIMEOUT_MINUTES) {
        await logEvent({ 
          instance, 
          messageId, 
          event: "AI_BLOCKED_BY_HUMAN_MODE",
          status: "skipped",
          payload: { traceId, minutesSinceTakeover, human_takeover_at: conv.human_takeover_at }
        });
        return;
      }

      const { error: updateError } = await supabaseAdmin
        .from("wa_conversas")
        .update({ attendance_mode: "AI", human_takeover_at: null })
        .or(`phone.eq.${conversationKey},phone.eq.${contactPhone},phone_number.eq.${contactPhone}`);

      await logEvent({ 
        instance, 
        messageId, 
        event: "human_takeover_expired_ai_reactivated",
        status: "reactivated",
        payload: { traceId, minutesSinceTakeover }
      });
    } else {
      await logEvent({
        instance,
        messageId,
        event: "ATTENDANCE_MODE_CHECKED",
        status: "success",
        payload: { traceId, mode: conv?.attendance_mode || "AI" }
      });
    }
    
    if (agent) {
      await logEvent({ 
        instance, 
        messageId, 
        event: "AGENT_RESOLVED",
        status: "success",
        payload: { status: agent.status, unitId: agent.unidade_id, traceId }
      });
    }

    const iaEnabled = isIAEnabled(agent);

    if (!iaEnabled) {
      const status = String(agent?.status || "").toLowerCase().trim();
      const blockedStates = ["inativo", "inactive", "disabled", "desativado", "false"];
      
      if (blockedStates.includes(status)) {
        await logEvent({ instance, messageId, event: "agent_inactive", status: "skipped", payload: { traceId } });
      } else if (!agent?.unidade_id) {
        await logEvent({ instance, messageId, event: "agent_without_unit", status: "skipped", payload: { traceId } });
      } else {
        await logEvent({
          instance,
          messageId,
          event: "agent_flow",
          status: "ia_disabled_generic",
          payload: { agent_status: agent?.status, unit_id: agent?.unidade_id, traceId }
        });
      }
      return;
    }

    // NOVO: Double-check attendance mode immediately before AI invocation to prevent race conditions
    const { data: finalCheck } = await supabaseAdmin
      .from("wa_conversas")
      .select("attendance_mode")
      .or(`phone.eq.${conversationKey},phone.eq.${contactPhone},phone_number.eq.${contactPhone}`)
      .maybeSingle();
      
    if (finalCheck?.attendance_mode === "HUMAN") {
      await logEvent({
        instance,
        messageId,
        event: "agent_flow_aborted_race_condition",
        status: "aborted",
        payload: { traceId, reason: "Human takeover detected just before AI run" }
      });
      return;
    }

    if (!text) {
      await logEvent({ instance, messageId, event: "agent_flow", status: "empty_text_skipped", payload: { traceId } });
      return;
    }

    const { normalizeConversationHistory } = await import("./history");
    const history = normalizeConversationHistory(
      (conv?.messages as any[]) || [],
      text,
      messageId
    );

    // Chama o orquestrador da IA Julia com logging e traceId
    const { runAgentWithLogging } = await import("@/lib/chat.server");
    
    await logEvent({
      instance,
      messageId,
      event: "AI_REQUEST_STARTED",
      status: "started",
      payload: { traceId, unitId: agent.unidade_id }
    });

    const result: any = await runAgentWithLogging({
      messages: history,
      instance,
      messageId,
      contactName: msg.pushName || conv?.contact_name || undefined,
      text,
      unidadeId: agent.unidade_id,
      contactPhone,
      conversationKey,
      customerContext: conv?.customer_context || {},
      traceId
    } as any);

    await logEvent({
      instance,
      messageId,
      event: "AI_RESPONSE_RECEIVED",
      status: "success",
      payload: { traceId, responseSnippet: String(result?.text || "").slice(0, 50) }
    });

    const replyText = String(result?.text || "").trim();
    if (!replyText) {
      await logEvent({
        instance,
        messageId,
        event: "agent_empty_response",
        status: "error",
        payload: { traceId }
      });
      return;
    }

    const { replyToUser } = await import("./reply.server");
    await replyToUser({
      instance,
      phone: contactPhone,
      text: replyText,
      conversationKey,
      messageId,
      traceId
    });

    await logEvent({ instance, messageId, event: "OUTBOUND_SENT", status: "success", payload: { traceId } });
  } catch (error) {
    console.error("[evolution] Error in runAgentFlow", error);
    await logEvent({
      instance,
      messageId,
      event: "agent_flow_error",
      status: "error",
      errorDetail: error instanceof Error ? error.message : String(error),
      payload: { traceId }
    });
  }
}
