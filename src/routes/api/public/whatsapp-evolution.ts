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
        const { isEvolutionConfigured } = await import("@/lib/evolution.server");
        const { isIAConfigured } = await import("@/lib/chat.server");
        
        const evoOk = await isEvolutionConfigured();
        const aiOk = await isIAConfigured();
        
        return new Response(JSON.stringify({ 
          ok: evoOk && aiOk, 
          service: "whatsapp-evolution-webhook",
          diagnostics: {
            evolution: evoOk ? "configured" : "missing",
            ai: aiOk ? "configured" : "missing"
          }
        }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      POST: async ({ request }) => {
        const traceId = `webhook-${Date.now()}`;
        
        // 1. Autenticação (Requisito 7)
        const auth = await authenticateWebhook(request);
        if (!auth.authenticated) {
          logger.warn("WEBHOOK_UNAUTHORIZED", "Tentativa de acesso não autorizado ao webhook", { 
            traceId,
            hasSecret: !!request.headers.get("x-webhook-secret") || !!new URL(request.url).searchParams.get("webhook_secret")
          });
          return new Response(auth.error || "Unauthorized", { status: 401 });
        }

        // 2. Parse do Payload
        const payload = await request.json().catch((err) => {
          logger.error("WEBHOOK_INVALID_JSON", "Erro ao processar JSON do webhook", { traceId, error: err.message });
          return null;
        });

        // 3. Instrumentação imediata (Requisito 4)
        logger.info("WEBHOOK_RAW_RECEIVED", "Payload detectado", { 
          traceId, 
          event: payload.event,
          instance: payload.instance || payload.instanceName,
          remoteJid: payload.data?.key?.remoteJid,
          messageId: payload.data?.key?.id,
          fromMe: payload.data?.key?.fromMe
        });

        // 3b. Normalização do Evento
        const eventData = normalizeEvolutionEvent(payload);
        logger.info("INSTANCE_RESOLVED", "Instância identificada", { traceId, instance: eventData.instance });

        
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
 
        // 4. Delegação (AWAIT OBRIGATÓRIO PARA SERVERLESS - Requisito 1)
        try {
          if (eventData.event === "connection.update") {
            await processConnectionUpdate(payload);
          } else if (eventData.event === "messages.upsert") {
            (payload as any)._traceId = traceId;
            await processMessagesUpsert(payload, request.url);
          } else if (eventData.event === "messages.ack") {
            await processMessageAck(payload);
          }
          
          logger.info("WEBHOOK_COMPLETED", "Processamento finalizado com sucesso", { traceId });
          return new Response("OK", { status: 200 });
        } catch (err: any) {
          logger.error("WEBHOOK_PROCESSING_FAILED", err.message, { 
            traceId, 
            event: eventData.event,
            stack: err.stack 
          });
          
          // Retornar 500 para falhas reais permite retry pela Evolution API (Requisito 1)
          return new Response(JSON.stringify({ 
            error: "Internal Processing Error", 
            message: err.message,
            traceId 
          }), { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
          });
        }
      }
    }
  }
});
