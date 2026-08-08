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
  const traceId = `${instance}:${messageId}`;

  try {
    const agent = await findAgentByInstance(instance);
    const phone = normalizePhone(msg.remoteJid);
    const conversationKey = buildConversationKey(instance, msg.remoteJid);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { HUMAN_TAKEOVER_TIMEOUT_MINUTES } = await import("../config");

    // BUSCA CONVERSA PARA CHECAR ATTENDANCE MODE
    const { data: conversation } = await supabaseAdmin
      .from("wa_conversas")
      .select("id, attendance_mode, human_takeover_at")
      .eq("instance", instance)
      .eq("phone", phone)
      .maybeSingle();

    if (conversation?.attendance_mode === "HUMAN") {
      const takeoverAt = conversation.human_takeover_at ? new Date(conversation.human_takeover_at).getTime() : 0;
      const minutesSinceTakeover = (Date.now() - takeoverAt) / 60000;

      if (minutesSinceTakeover < HUMAN_TAKEOVER_TIMEOUT_MINUTES) {
        await logEvent({ 
          instance, 
          messageId, 
          event: "agent_flow_skipped_human_mode",
          status: "skipped",
          payload: { traceId, minutesSinceTakeover }
        });
        return;
      }

      // Expirou -> volta para AI
      await supabaseAdmin
        .from("wa_conversas")
        .update({ attendance_mode: "AI", human_takeover_at: null })
        .eq("id", conversation.id);

      await logEvent({ 
        instance, 
        messageId, 
        event: "human_takeover_expired_ai_reactivated",
        status: "reactivated",
        payload: { traceId, minutesSinceTakeover }
      });
    }
    
    if (agent) {
      await logEvent({ 
        instance, 
        messageId, 
        event: "agent_status_checked",
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

    const text = textOverride?.trim() || extractMessageText(msg.message);
    if (!text) {
      await logEvent({ instance, messageId, event: "agent_flow", status: "empty_text_skipped", payload: { traceId } });
      return;
    }


    const phone = normalizePhone(msg.remoteJid);
    const conversationKey = buildConversationKey(instance, msg.remoteJid);

    // Chama o orquestrador da IA Julia com logging e traceId
    const { runAgentWithLogging } = await import("@/lib/chat.server");
    await runAgentWithLogging({
      instance,
      messageId,
      contactName: msg.pushName || undefined,
      text,
      unidadeId: agent.unidade_id,
      contactPhone: phone,
      conversationKey,
      traceId
    } as any);

    await logEvent({ instance, messageId, event: "agent_flow_completed", status: "success", payload: { traceId } });
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