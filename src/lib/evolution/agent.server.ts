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
  return !!(agent && agent.status === "ativo" && agent.unidade_id);
}

export async function runAgentFlow(msg: NormalizedEvolutionMessage) {
  try {
    const agent = await findAgentByInstance(msg.instance);
    const iaEnabled = isIAEnabled(agent);

    if (!iaEnabled) {
      await logEvent({
        instance: msg.instance,
        messageId: msg.messageId,
        event: "agent_flow",
        status: "ia_disabled_or_no_unit",
        payload: { agent_status: agent?.status, unit_id: agent?.unidade_id }
      });
      return;
    }

    const text = extractMessageText(msg.message);
    if (!text) {
      await logEvent({
        instance: msg.instance,
        messageId: msg.messageId,
        event: "agent_flow",
        status: "empty_text_skipped"
      });
      return;
    }

    const phone = normalizePhone(msg.remoteJid);
    const conversationKey = buildConversationKey(msg.instance, msg.remoteJid);

    // Chama o orquestrador da IA Julia
    await runAgent({
      instance: msg.instance,
      remoteJid: msg.remoteJid,
      messageId: msg.messageId,
      pushName: msg.pushName || undefined,
      text,
      unidadeId: agent.unidade_id,
      phone,
      conversationKey
    } as any);

    await logEvent({
      instance: msg.instance,
      messageId: msg.messageId,
      event: "agent_flow",
      status: "agent_triggered"
    });
  } catch (error) {
    console.error("[evolution] Error in runAgentFlow", error);
    await logEvent({
      instance: msg.instance,
      messageId: msg.messageId,
      event: "agent_flow_error",
      status: "error",
      errorDetail: error instanceof Error ? error.message : String(error)
    });
  }
}