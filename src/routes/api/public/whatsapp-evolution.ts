import { createFileRoute } from "@tanstack/react-router";
import { authenticateWebhook } from "@/lib/evolution/auth.server";
import { normalizeEvolutionEvent } from "@/lib/evolution/event-normalizer";
import { processConnectionUpdate, processMessagesUpsert } from "@/lib/evolution/processor.server";
import { processMessageAck } from "@/lib/evolution/ack-processor.server";
import { logEvent } from "@/lib/evolution/logger.server";
import { logger } from "@/lib/observability/logger.server";

export const Route = createFileRoute("/api/public/whatsapp-evolution")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(JSON.stringify({ ok: true, service: "whatsapp-evolution-webhook" }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      POST: async ({ request }) => {
        const traceId = `webhook-entry-${Date.now()}`;
        
        // 1. Autenticação
        const auth = await authenticateWebhook(request);
        if (!auth.authenticated) {
          logger.warn("WEBHOOK_UNAUTHORIZED", "Tentativa de acesso não autorizado ao webhook", { traceId });
          return new Response(auth.error || "Unauthorized", { status: 401 });
        }

        // 2. Parse do Payload
        const payload = await request.json().catch((err) => {
          logger.error("WEBHOOK_INVALID_JSON", "Erro ao processar JSON do webhook", { traceId, error: err.message });
          return null;
        });

        if (!payload) {
          await logEvent({ instance: "unknown", event: "webhook_received", status: "invalid_payload" });
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        // 3. Normalização do Evento
        const eventData = normalizeEvolutionEvent(payload);
        
        if (eventData.event === "unknown") {
          logger.info("WEBHOOK_IGNORED", "Evento desconhecido ou não suportado", { traceId, event: payload.event });
          return new Response(JSON.stringify({ ok: true, ignored: true, reason: "unsupported_event" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        await logEvent({ 
          instance: eventData.instance, 
          event: "webhook_received", 
          status: "success",
          payload: { traceId, event: eventData.event }
        });
        
        logger.info("WEBHOOK_ENTRY", `Entrada de webhook Evolution [${traceId}] [VERSION: await-v1]`, { 
          instance: eventData.instance, 
          event: eventData.event,
          processorVersion: "await-v1"
        });
 
        // 4. Delegação assíncrona (AWAIT OBRIGATÓRIO PARA SERVERLESS)
        if (eventData.event === "connection.update") {
          await processConnectionUpdate(payload).catch(err => 
            logger.error("ASYNC_CONNECTION_UPDATE_ERROR", err.message, { traceId })
          );
        } else if (eventData.event === "messages.upsert") {
          (payload as any)._traceId = traceId;
          try {
            await processMessagesUpsert(payload, request.url);
          } catch (err: any) {
            logger.error("MESSAGE_PROCESS_ERROR", err.message, { traceId });
            logger.audit("MESSAGE_PROCESSING_ABORTED", "Erro no processamento da mensagem", {
              stage: "PROCESSOR",
              traceId,
              error: err.message
            });
          }
        } else if (eventData.event === "messages.ack") {
          await processMessageAck(payload).catch(err => 
            logger.error("ASYNC_ACK_PROCESS_ERROR", err.message, { traceId })
          );
        }

        return new Response("OK");
      }
    }
  }
});