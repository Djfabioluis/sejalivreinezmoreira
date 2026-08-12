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
      POST: async ({ request }) => {
        // 1. Autenticação (Rápida)
        const auth = await authenticateWebhook(request);
        if (!auth.authenticated) {
          return new Response(auth.error || "Unauthorized", { status: 401 });
        }

        // 2. Parse do Payload (Rápido)
        const payload = await request.json().catch(() => null);
        if (!payload) {
          await logEvent({ instance: "unknown", event: "webhook_received", status: "invalid_payload" });
          return new Response("Bad Request", { status: 400 });
        }

        // 3. Normalização do Evento (Rápida)
        const eventData = normalizeEvolutionEvent(payload);
        const traceId = `webhook-${eventData.instance}-${Date.now()}`;
        
        await logEvent({ 
          instance: eventData.instance, 
          event: "webhook_received", 
          status: "success",
          payload: { traceId, event: eventData.event }
        });
        
        logger.info("WEBHOOK_ENTRY", `Entrada de webhook Evolution [${traceId}]`, { 
          instance: eventData.instance, 
          event: eventData.event 
        });
 
        // 4. Delegação assíncrona para o Processor (NON-BLOCKING)
        if (eventData.event === "connection.update") {
          processConnectionUpdate(payload).catch(err => 
            logger.error("ASYNC_CONNECTION_UPDATE_ERROR", err.message, { traceId })
          );
        } else if (eventData.event === "messages.upsert") {
          (payload as any)._traceId = traceId;
          // Dispara o processamento em background e retorna OK imediatamente para evitar retries do Evolution
          processMessagesUpsert(payload, request.url).catch(err => 
            logger.error("ASYNC_MESSAGE_PROCESS_ERROR", err.message, { traceId })
          );
        } else if (eventData.event === "messages.ack") {
          processMessageAck(payload).catch(err => 
            logger.error("ASYNC_ACK_PROCESS_ERROR", err.message, { traceId })
          );
        }

        // Retorna HTTP 200 IMEDIATAMENTE para o Evolution API
        return new Response("OK");
      }
    }
  }
});