import { NormalizedEvolutionEvent } from "./types";
import { logEvent } from "./logger.server";
import { normalizeEvolutionMessages } from "./message-normalizer";
import { extractMessageText } from "./message-text";
import { normalizePhone, buildConversationKey, normalizeContactName } from "./contact";
import { checkIdempotency } from "./idempotency.server";
import { findAgentByInstance, isIAEnabled } from "./agent.server";
import { appendIncomingMessage, updateConversationMetadata, getConversationHistory } from "./conversation.server";
import { normalizeConversationHistory } from "./history";
import { executeAI } from "./ai-context.server";
import { replyToUser } from "./reply.server";

export async function processConnectionUpdate(event: NormalizedEvolutionEvent) {
  const instance = event.instance;
  const state = event.data?.state || event.payload.state;

  if (state === "open" || state === "connected") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: agente } = await supabaseAdmin
      .from("wa_agentes" as never)
      .select("id, unidade_id")
      .eq("instancia", instance)
      .maybeSingle();

    if (agente) {
      const ag = agente as any;
      const newStatus = ag.unidade_id ? "ativo" : "conectado_sem_unidade";
      await supabaseAdmin
        .from("wa_agentes" as never)
        .update({ 
          status: newStatus, 
          atualizado_em: new Date().toISOString() 
        } as never)
        .eq("id", ag.id);
    }
  }
}

export async function processMessagesUpsert(event: NormalizedEvolutionEvent, requestUrl: string) {
  const messages = normalizeEvolutionMessages(event.payload, requestUrl);

  for (const msg of messages) {
    try {
      // Filtros básicos
      if (msg.fromMe) {
        await logEvent({ instance: msg.instance, messageId: msg.messageId, event: "filter", status: "ignored_from_me" });
        continue;
      }
      if (msg.remoteJid.includes("@g.us")) {
        await logEvent({ instance: msg.instance, messageId: msg.messageId, event: "filter", status: "ignored_group" });
        continue;
      }
      if (msg.remoteJid.includes("broadcast")) {
        await logEvent({ instance: msg.instance, messageId: msg.messageId, event: "filter", status: "ignored_broadcast" });
        continue;
      }

      const text = extractMessageText(msg.message);
      if (!text) {
        await logEvent({ instance: msg.instance, messageId: msg.messageId, event: "extraction", status: "empty_text" });
        continue;
      }

      const phone = normalizePhone(msg.remoteJid);
      
      // Idempotência
      const { isDuplicate, finalMessageId } = await checkIdempotency(
        msg.instance, 
        msg.messageId, 
        phone, 
        msg.timestamp, 
        text
      );
      if (isDuplicate) continue;

      const conversationKey = buildConversationKey(msg.instance, phone);
      const contactName = normalizeContactName(msg.pushName);

      // Agente e Unidade
      const agent = await findAgentByInstance(msg.instance);
      const isIAActive = isIAEnabled(agent);

      // Persistência imediata
      await appendIncomingMessage({
        conversationKey,
        messageId: finalMessageId,
        text,
        instance: msg.instance,
        phone,
        contactName,
        isIAActive
      });

      // Metadados
      if (agent) {
        await updateConversationMetadata(conversationKey, {
          agent_id: agent.id,
          unidade_id: agent.unidade_id,
          contact_name: contactName
        });
      }

      // IA
      if (isIAActive) {
        const historyData = await getConversationHistory(conversationKey);
        const history = normalizeConversationHistory(historyData?.messages || [], text);
        
        const aiResponse = await executeAI({
          contactName: contactName || historyData?.contact_name,
          contactPhone: phone,
          instance: msg.instance,
          unidadeId: agent.unidade_id,
          customerContext: historyData?.customer_context,
          history
        });

        if (aiResponse) {
          await replyToUser({
            instance: msg.instance,
            phone,
            text: aiResponse,
            conversationKey
          });
        }
      }
    } catch (error: any) {
      await logEvent({
        instance: msg.instance,
        messageId: msg.messageId,
        event: "message_processing",
        status: "error",
        errorDetail: error.message
      });
    }
  }
}
