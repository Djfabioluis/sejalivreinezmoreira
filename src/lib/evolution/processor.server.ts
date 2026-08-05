import { normalizeEvolutionMessages } from "./message-normalizer";
import { claimEvent, markEventProcessed, markEventFailed } from "./idempotency.server";
import { appendIncomingMessage } from "./conversation.server";
import { runAgentFlow, findAgentByInstance, isIAEnabled } from "./agent.server";
import { logEvent } from "./logger.server";
import { extractMessageText } from "./message-text";
import { normalizePhone, buildConversationKey, normalizeContactName } from "./contact";

/** Normalização estrita: só valores explicitamente verdadeiros contam como fromMe. */
export function isFromMe(value: unknown): boolean {
  return value === true || value === 1 || value === "true" || value === "1";
}

/**
 * Orquestrador principal para eventos de mensagens (messages.upsert)
 */
export async function processMessagesUpsert(payload: any, requestUrl: string) {
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
      // 2. fromMe (mensagem enviada pelo próprio número) → ignorar cedo
      if (isFromMe(msg.fromMe)) {
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

      // 3. Idempotência atômica (instance + messageId), com recuperação de travamentos
      const { claimed, reason, finalMessageId } = await claimEvent({
        instance: msg.instance,
        messageId: msg.messageId,
        remoteJid: msg.remoteJid,
        phone,
        timestamp: msg.timestamp,
        text: text || "",
        traceId
      });

      if (!claimed) {
        await logEvent({
          instance: msg.instance,
          messageId: finalMessageId,
          event: "message_skipped",
          status: "skipped",
          payload: { traceId, reason }
        });
        continue;
      }

      // 4. Lock por conversa (concorrência) — nunca bloqueia definitivamente
      const conversationKey = buildConversationKey(msg.instance, msg.remoteJid);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: lockAcquired, error: lockError } = await supabaseAdmin.rpc("acquire_conversation_lock" as any, {
        p_conversation_key: conversationKey,
        p_trace_id: traceId
      });

      if (lockError) {
        await logEvent({
          instance: msg.instance,
          messageId: finalMessageId,
          event: "conversation_lock_error",
          status: "warning",
          errorDetail: lockError.message,
          payload: { traceId, conversationKey }
        });
      }

      const hasLock = lockAcquired === true;

      if (!hasLock && !lockError) {
        // Outra execução está tratando esta conversa neste instante.
        await markEventFailed(msg.instance, finalMessageId, "conversation_locked_retry");
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
        await logEvent({ instance: msg.instance, messageId: finalMessageId, event: "processing_started", status: "started", payload: { traceId, reason } });

        // 5. Agente e Unidade
        const agent = await findAgentByInstance(msg.instance);
        const isIAActive = isIAEnabled(agent);

        if (agent) {
          const { updateConversationMetadata } = await import("./conversation.server");
          await updateConversationMetadata(conversationKey, {
            agent_id: agent.id,
            unidade_id: agent.unidade_id,
            contact_name: msg.pushName || undefined
          });
        }

        // 6. Persistência da mensagem do cliente (sempre, mesmo sem IA)
        await appendIncomingMessage({
          conversationKey,
          messageId: finalMessageId,
          text: text || "[Mídia/Outro]",
          instance: msg.instance,
          phone,
          contactName: normalizeContactName(msg.pushName || undefined),
          isIAActive
        });

        // 7. Fluxo da IA (uma única chamada por mensagem)
        if (isIAActive) {
          await runAgentFlow({
            ...msg,
            messageId: finalMessageId
          });
        }

        await markEventProcessed(msg.instance, finalMessageId);

        await logEvent({
          instance: msg.instance,
          messageId: finalMessageId,
          event: "message_processing_completed",
          status: "success",
          payload: { traceId }
        });
      } catch (innerError) {
        await markEventFailed(
          msg.instance,
          finalMessageId,
          innerError instanceof Error ? innerError.message : String(innerError)
        );
        throw innerError;
      } finally {
        // 8. Liberar lock SEMPRE
        if (hasLock) {
          const { error: releaseError } = await supabaseAdmin.rpc("release_conversation_lock" as any, {
            p_conversation_key: conversationKey,
            p_trace_id: traceId
          });
          await logEvent({
            instance: msg.instance,
            messageId: finalMessageId,
            event: "conversation_lock_released",
            status: releaseError ? "error" : "success",
            errorDetail: releaseError?.message,
            payload: { traceId }
          });
        }
      }
    } catch (error) {
      console.error("[evolution] Error processing message", msg.messageId, error);
      await logEvent({
        instance: msg.instance,
        messageId: msg.messageId,
        event: "process_error",
        status: "error",
        errorDetail: error instanceof Error ? error.message : String(error),
        payload: { traceId }
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