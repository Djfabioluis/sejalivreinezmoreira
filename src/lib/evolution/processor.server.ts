import { normalizeEvolutionMessages } from "./message-normalizer";
import { checkIdempotency } from "./idempotency.server";
import { appendIncomingMessage } from "./conversation.server";
import { runAgentFlow } from "./agent.server";
import { logEvent } from "./logger.server";
import { NormalizedEvolutionMessage } from "./types";

export async function processEvolutionWebhook(payload: any, requestUrl: string) {
  const startTime = Date.now();
  
  // 1. Normalização
  const messages = normalizeEvolutionMessages(payload, requestUrl);
  
  if (messages.length === 0) {
    // Log detalhado de falha na normalização ou ausência de mensagens
    await logEvent({
      instance: payload.instance || payload.instanceName || "unknown",
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

  // Log de mensagens normalizadas
  await logEvent({
    instance: messages[0].instance,
    event: "message_normalized",
    status: "success",
    payload: { count: messages.length, first_id: messages[0].messageId }
  });

  for (const msg of messages) {
    try {
      // 2. Idempotência
      const isDuplicate = await checkIdempotency(msg.instance, msg.messageId);
      if (isDuplicate) {
        await logEvent({
          instance: msg.instance,
          messageId: msg.messageId,
          event: "duplicate_message",
          status: "skipped"
        });
        continue;
      }

      // 3. Persistência
      const saved = await appendIncomingMessage(msg);
      
      if (saved) {
        await logEvent({
          instance: msg.instance,
          messageId: msg.messageId,
          event: "message_saved",
          status: "success",
          durationMs: Date.now() - startTime
        });
      } else {
        await logEvent({
          instance: msg.instance,
          messageId: msg.messageId,
          event: "message_save_failed",
          status: "error",
          errorDetail: "RPC append_wa_message returned false"
        });
      }

      // 4. Fluxo da IA (se não for do próprio bot)
      if (!msg.fromMe) {
        await runAgentFlow(msg);
      }
    } catch (error) {
      console.error("[evolution] Error processing message", msg.messageId, error);
      await logEvent({
        instance: msg.instance,
        messageId: msg.messageId,
        event: "process_error",
        status: "error",
        errorDetail: error instanceof Error ? error.message : String(error)
      });
    }
  }
}