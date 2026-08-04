import { NormalizedEvolutionMessage } from "./types";
import { runAgent } from "@/lib/chat.server";
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

export async function runAgentFlow(msg: NormalizedEvolutionMessage) {
  const messageId = msg.messageId;
  const instance = msg.instance;

  try {
    const agent = await findAgentByInstance(instance);
    
    if (agent) {
      await logEvent({ 
        instance, 
        messageId, 
        event: "agent_status_checked",
        status: "success",
        payload: { status: agent.status, unitId: agent.unidade_id }
      });
    }

    const iaEnabled = isIAEnabled(agent);

    if (!iaEnabled) {
      const status = String(agent?.status || "").toLowerCase().trim();
      const blockedStates = ["inativo", "inactive", "disabled", "desativado", "false"];
      
      if (blockedStates.includes(status)) {
        await logEvent({ instance, messageId, event: "agent_inactive", status: "skipped" });
      } else if (!agent?.unidade_id) {
        await logEvent({ instance, messageId, event: "agent_without_unit", status: "skipped" });
      } else {
        await logEvent({
          instance,
          messageId,
          event: "agent_flow",
          status: "ia_disabled_generic",
          payload: { agent_status: agent?.status, unit_id: agent?.unidade_id }
        });
      }
      return;
    }

    await logEvent({ instance, messageId, event: "agent_unit_resolved", status: "success", payload: { unitId: agent.unidade_id } });

    const text = extractMessageText(msg.message);
    if (!text) {
      await logEvent({ instance, messageId, event: "agent_flow", status: "empty_text_skipped" });
      return;
    }

    const phone = normalizePhone(msg.remoteJid);
    const conversationKey = buildConversationKey(instance, msg.remoteJid);

    // Chama o orquestrador da IA Julia com logging
    const { runAgentWithLogging } = await import("@/lib/chat.server");
    await runAgentWithLogging({
      instance,
      remoteJid: msg.remoteJid,
      messageId,
      pushName: msg.pushName || undefined,
      text,
      unidadeId: agent.unidade_id,
      phone,
      conversationKey
    });

    await logEvent({ instance, messageId, event: "agent_flow", status: "agent_triggered" });
  } catch (error) {
    console.error("[evolution] Error in runAgentFlow", error);
    await logEvent({
      instance,
      messageId,
      event: "agent_flow_error",
      status: "error",
      errorDetail: error instanceof Error ? error.message : String(error)
    });
  }
}