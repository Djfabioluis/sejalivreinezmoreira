import { createFileRoute } from "@tanstack/react-router";
import { runAgent } from "@/lib/chat.server";
import { getEvolutionConfig, sendEvolutionText } from "@/lib/evolution.server";

function extractMessageText(message: any): string {
  if (!message) return "";
  
  // Recursively extract text from various message types
  const content = message.conversation || 
                  message.extendedTextMessage?.text || 
                  message.imageMessage?.caption || 
                  message.videoMessage?.caption || 
                  message.documentMessage?.caption || 
                  message.buttonsResponseMessage?.selectedButtonId || 
                  message.listResponseMessage?.title || 
                  message.templateButtonReplyMessage?.selectedId || 
                  message.interactiveResponseMessage?.body?.text ||
                  message.ephemeralMessage?.message ||
                  message.viewOnceMessage?.message ||
                  message.viewOnceMessageV2?.message;

  if (typeof content === "string") return content;
  if (typeof content === "object" && content !== null) return extractMessageText(content);
  
  return "";
}

async function logEvent(entry: {
  instance: string;
  messageId?: string | null;
  event: string;
  status: string;
  durationMs?: number | null;
  errorDetail?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("evo_webhook_logs" as never).insert({
      instance: entry.instance,
      message_id: entry.messageId ?? null,
      event: entry.event,
      status: entry.status,
      duration_ms: entry.durationMs ?? null,
      error_detail: entry.errorDetail ? String(entry.errorDetail).slice(0, 500) : null,
    } as never);
  } catch (err) {
    console.error("[evolution] log_failed", err);
  }
}

export const Route = createFileRoute("/api/public/whatsapp-evolution")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const start = Date.now();
        const config = await getEvolutionConfig();
        const url = new URL(request.url);
        
        // 1. AUTENTICAÇÃO DO WEBHOOK
        const xSecret = request.headers.get("x-webhook-secret");
        const authHeader = request.headers.get("Authorization");
        const querySecret = url.searchParams.get("webhook_secret");
        
        let providedSecret = xSecret || querySecret || "";
        if (!providedSecret && authHeader?.startsWith("Bearer ")) {
          providedSecret = authHeader.substring(7);
        }

        if (config.webhookSecret) {
          if (providedSecret !== config.webhookSecret) {
            await logEvent({ instance: "auth_gate", event: "webhook_authenticated", status: "unauthorized" });
            return new Response("Unauthorized", { status: 401 });
          }
          await logEvent({ instance: "auth_gate", event: "webhook_authenticated", status: "success" });
        } else {
          await logEvent({ instance: "auth_gate", event: "webhook_secret_not_configured", status: "warning" });
        }

        const payload = await request.json().catch(() => null);
        if (!payload) {
          await logEvent({ instance: "unknown", event: "webhook_received", status: "bad_request" });
          return new Response("Bad Request", { status: 400 });
        }

        // 2. EXTRAÇÃO DA INSTÂNCIA
        let instancia = url.searchParams.get("instance") || 
                        payload.instance || 
                        payload.instanceName || 
                        payload.data?.instance || 
                        payload.data?.instanceName;
        
        if (!instancia && Array.isArray(payload.data) && payload.data[0]?.instance) {
          instancia = payload.data[0].instance;
        }

        if (!instancia || instancia === "unknown") {
          await logEvent({ instance: "missing_instance", event: "instance_extracted", status: "error" });
          return new Response("OK"); // Ignorado conforme padrão
        }

        await logEvent({ instance: instancia, event: "webhook_received", status: "success" });
        await logEvent({ instance: instancia, event: "instance_extracted", status: "success" });

        // 3. NORMALIZAÇÃO DE EVENTOS
        const rawEvent = (payload.event || "unknown").toLowerCase().replace(/_/g, ".");
        let normalizedEvent = rawEvent;
        if (rawEvent.includes("messages.upsert") || rawEvent.includes("message.upsert")) normalizedEvent = "messages.upsert";
        if (rawEvent.includes("connection.update")) normalizedEvent = "connection.update";

        await logEvent({ instance: instancia, event: "event_normalized", status: normalizedEvent });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // CONNECTION_UPDATE
        if (normalizedEvent === "connection.update") {
          const state = payload.data?.state || payload.state;
          if (state === "open" || state === "connected") {
            const { data: agente } = await supabaseAdmin
              .from("wa_agentes" as never)
              .select("id, unidade_id")
              .eq("instancia", instancia)
              .maybeSingle();
            
            if (agente) {
              const ag = agente as any;
              const newStatus = ag.unidade_id ? "ativo" : "conectado_sem_unidade";
              await supabaseAdmin
                .from("wa_agentes" as never)
                .update({ status: newStatus, atualizado_em: new Date().toISOString() } as never)
                .eq("id", ag.id);
            }
          }
          return new Response("OK");
        }

        if (normalizedEvent !== "messages.upsert") {
          return new Response("OK");
        }

        const messages = Array.isArray(payload.data) ? payload.data : [payload.data].filter(Boolean);
        if (messages.length === 0) return new Response("OK");

        for (const msg of messages) {
          const remoteJid = msg.key?.remoteJid;
          const messageId = msg.key?.id;
          if (!remoteJid || !messageId) continue;
          if (msg.key.fromMe || remoteJid.includes("@g.us") || remoteJid.includes("broadcast")) continue;

          // 7. IDEMPOTÊNCIA ATÔMICA
          const { error: eventErr } = await supabaseAdmin.from("evo_events" as never).insert({ 
            message_id: messageId, 
            instance: instancia 
          } as never);

          if (eventErr) {
            if (eventErr.code === "23505") { // Duplicidade
              await logEvent({ instance: instancia, messageId, event: "duplicate_message", status: "ignored" });
              continue;
            }
            await logEvent({ instance: instancia, messageId, event: "event_save_failed", status: "error", errorDetail: eventErr.message });
            continue; // Fail-closed
          }

          const phone = remoteJid.split("@")[0].replace(/\D/g, "");
          const conversationId = `${instancia}:${phone}`;
          const contactName = msg.pushName || null;

          // 8. EXTRAÇÃO DE TEXTO
          const text = extractMessageText(msg.message);
          if (!text) {
            await logEvent({ instance: instancia, messageId, event: "incoming_message_extracted", status: "empty_text" });
            continue;
          }

          await logEvent({ instance: instancia, messageId, event: "incoming_message_extracted", status: "success" });

          // Buscar agente
          const { data: agenteRow } = await supabaseAdmin
            .from("wa_agentes" as never)
            .select("id, status, unidade_id")
            .eq("instancia", instancia)
            .maybeSingle();
          
          const agente = agenteRow as any;
          if (!agente) {
             await logEvent({ instance: instancia, messageId, event: "agent_not_found", status: "warning" });
          }

          // 4. SALVAR MENSAGEM ANTES DE BLOQUEAR IA
          const { error: rpcErr } = await supabaseAdmin.rpc("append_wa_message", {
            p_phone: conversationId,
            p_message: { id: messageId, role: "user", parts: [{ type: "text", text }] },
            p_instance: instancia,
            p_phone_number: phone,
            p_contact_name: contactName,
            p_increment_unread: true,
            p_new_status: (agente?.unidade_id && agente?.status === "ativo") ? "aberta" : "waiting_for_unit_selection"
          });

          // 5. VALIDAR TODAS AS RPCS
          if (rpcErr) {
            await logEvent({ instance: instancia, messageId, event: "conversation_save_failed", status: "error", errorDetail: rpcErr.message });
            continue;
          }

          await logEvent({ instance: instancia, messageId, event: "message_saved", status: "success" });

          if (agente) {
             await supabaseAdmin
               .from("wa_conversas" as never)
               .update({ agent_id: agente.id, unidade_id: agente.unidade_id } as never)
               .eq("phone", conversationId);
          }

          // Avaliar se IA pode operar
          if (!agente || !agente.unidade_id || agente.status !== "ativo") {
            const reason = !agente ? "agent_not_found" : (!agente.unidade_id ? "agent_without_unit" : "agent_inactive");
            await logEvent({ instance: instancia, messageId, event: reason, status: "skipped_ia" });
            continue;
          }

          // 6. ENVIO DA RESPOSTA
          try {
            await logEvent({ instance: instancia, messageId, event: "ai_started", status: "pending" });
            
            const aiResponse = await runAgent([{ id: messageId, role: "user", parts: [{ type: "text", text }] } as any], { 
              sandbox: false,
              persona: contactName ? `O nome do cliente é ${contactName}.` : undefined,
              unidadeId: agente.unidade_id
            });
            
            if (aiResponse) {
              await logEvent({ instance: instancia, messageId, event: "ai_completed", status: "success" });
              await logEvent({ instance: instancia, messageId, event: "evolution_send_started", status: "pending" });
              
              const sent = await sendEvolutionText(instancia, phone, aiResponse);
              
              if (sent) {
                const { error: aiSaveErr } = await supabaseAdmin.rpc("append_wa_message", {
                  p_phone: conversationId,
                  p_message: { id: `ai-${Date.now()}`, role: "assistant", parts: [{ type: "text", text: aiResponse }] },
                  p_instance: instancia,
                  p_phone_number: phone,
                  p_increment_unread: false
                });

                if (aiSaveErr) {
                  await logEvent({ instance: instancia, messageId, event: "assistant_message_save_failed", status: "error", errorDetail: aiSaveErr.message });
                } else {
                  await logEvent({ instance: instancia, messageId, event: "evolution_send_completed", status: "success", durationMs: Date.now() - start });
                }
              } else {
                await logEvent({ instance: instancia, messageId, event: "evolution_send_failed", status: "error" });
              }
            }
          } catch (aiErr: any) {
            await logEvent({ instance: instancia, messageId, event: "ai_processing", status: "error", errorDetail: aiErr.message });
          }
        }

        return new Response("OK");
      }
    }
  }
});