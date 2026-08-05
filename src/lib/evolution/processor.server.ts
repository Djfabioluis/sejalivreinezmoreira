import { normalizeEvolutionMessages } from "./message-normalizer";
import { checkIdempotency } from "./idempotency.server";
import { appendIncomingMessage } from "./conversation.server";
import { runAgentFlow, findAgentByInstance, isIAEnabled } from "./agent.server";
import { logEvent } from "./logger.server";
import { extractMessageText } from "./message-text";
import { normalizePhone, buildConversationKey, normalizeContactName } from "./contact";

/**
 * Orquestrador principal para eventos de mensagens (messages.upsert)
 */
export async function processMessagesUpsert(payload: any, requestUrl: string) {
  const startTime = Date.now();
  const instance = payload.instance || payload.instanceName || "unknown";
  
  // 1. Normalização
  const messages = normalizeEvolutionMessages(payload, requestUrl);
  
  if (messages.length === 0) {
    await logEvent({
      instance,
      event: "payload_shape_detected",
      status: "no_messages_found",
      payload: { 
        event: payload.event,
        data_keys: payload.data ? Object.keys(payload.data) : null,
        payload_keys: Object.keys(payload)
      }
    });
    return;
  }

  for (const msg of messages) {
    const traceId = `${msg.instance}:${msg.messageId}`;
    
    try {
      // 2. Verificar fromMe IMEDIATAMENTE (antes de idempotência e persistência)
      // O requisito diz: registrar message_ignored_from_me, retornar imediatamente, não salvar como user, não chamar IA.
      if (msg.fromMe) {
        await logEvent({
          instance: msg.instance,
          messageId: msg.messageId,
          event: "message_ignored_from_me",
          status: "skipped",
          payload: { traceId }
        });
        continue;
      }

      const text = extractMessageText(msg.message);
      const phone = normalizePhone(msg.remoteJid);

      // Ignorar grupos, transmissões e status
      if (msg.remoteJid.includes("@g.us") || msg.remoteJid.includes("@broadcast") || msg.remoteJid === "status@broadcast") {
        await logEvent({
          instance: msg.instance,
          messageId: msg.messageId,
          event: "ignored_chat_type",
          status: "skipped",
          payload: { remoteJid: msg.remoteJid, traceId }
        });
        continue;
      }
      
      // 3. Idempotência Atômica
      const { isDuplicate, finalMessageId } = await checkIdempotency(
        msg.instance, 
        msg.messageId,
        phone,
        msg.timestamp,
        text || ""
      );

      if (isDuplicate) {
        await logEvent({
          instance: msg.instance,
          messageId: finalMessageId,
          event: "duplicate_message",
          status: "skipped",
          payload: { traceId }
        });
        continue;
      }

      // 4. Lock por Conversa (Prevenção de concorrência)
      const conversationKey = buildConversationKey(msg.instance, msg.remoteJid);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      
      const { data: lockAcquired } = await supabaseAdmin.rpc("acquire_conversation_lock" as any, {
        p_conversation_key: conversationKey,
        p_trace_id: traceId
      });

      if (!lockAcquired) {
        await logEvent({
          instance: msg.instance,
          messageId: finalMessageId,
          event: "conversation_processing_locked",
          status: "skipped",
          payload: { traceId, conversationKey }
        });
        continue;
      }

      try {
        await logEvent({ instance: msg.instance, messageId: finalMessageId, event: "processing_started", status: "started", payload: { traceId } });

        // 5. Agente e Unidade
        const agent = await findAgentByInstance(msg.instance);
        const isIAActive = isIAEnabled(agent);

        // 5.1 Atualizar metadados da conversa se o agente foi encontrado
        if (agent) {
          const { updateConversationMetadata } = await import("./conversation.server");
          await updateConversationMetadata(conversationKey, {
            agent_id: agent.id,
            unidade_id: agent.unidade_id,
            contact_name: msg.pushName || undefined
          });
        }

        // 6. Persistência da Mensagem do Usuário
        await appendIncomingMessage({
          conversationKey,
          messageId: finalMessageId,
          text: text || "[Mídia/Outro]",
          instance: msg.instance,
          phone,
          contactName: normalizeContactName(msg.pushName || undefined),
          isIAActive
        });
        
        // 7. Fluxo da IA
        if (isIAActive) {
          await runAgentFlow({
            ...msg,
            messageId: finalMessageId
          });
        }
        
        await logEvent({
          instance: msg.instance,
          messageId: finalMessageId,
          event: "message_processing_completed",
          status: "success",
          payload: { traceId }
        });
      } finally {
        // 8. Liberar Lock
        await supabaseAdmin.rpc("release_conversation_lock" as any, {
          p_conversation_key: conversationKey,
          p_trace_id: traceId
        });
        await logEvent({ instance: msg.instance, messageId: finalMessageId, event: "conversation_lock_released", status: "success", payload: { traceId } });
      }
    } catch (error) {
      console.error("[evolution] Error processing message", msg.messageId, error);
      await logEvent({
        instance: msg.instance,
        messageId: msg.messageId,
        event: "process_error",
        status: "error",
        errorDetail: error instanceof Error ? error.message : String(error),
        payload: { traceId: `${msg.instance}:${msg.messageId}` }
      });
    }
  }
}

/**
 * Orquestrador para atualizações de conexão
 */
export async function processConnectionUpdate(payload: any) {
  const instance = payload.instance || payload.instanceName || "unknown";
  
  await logEvent({
    instance,
    event: "connection.update",
    status: payload.data?.status || "updated",
    payload: payload.data
  });

  // Se a conexão foi aberta, podemos atualizar o status do agente no banco
  if (payload.data?.status === "open") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("wa_agentes" as never)
      .update({ status_conexao: "conectado" } as never)
      .eq("instancia", instance);
  }
}