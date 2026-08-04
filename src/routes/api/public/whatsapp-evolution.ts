import { createFileRoute } from "@tanstack/react-router";
import { runAgent } from "@/lib/chat.server";
import { getEvolutionConfig, sendEvolutionText } from "@/lib/evolution.server";
import { normalizeContactName, buildConversationKey, normalizeWhatsAppPhone } from "@/lib/whatsapp-utils";
import { extractConversationMessageText } from "@/lib/whatsapp-inbox.functions";
import { createHash } from "crypto";

// --- HELPERS ---

function extractMessageText(message: any): string {
  if (!message) return "";
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

function normalizeEvolutionMessage(payload: any) {
  // Extract data (can be object, array, or directly in payload)
  const data = payload.data || payload;
  const msgArray = Array.isArray(data) ? data : (data.messages || [data]);
  const msg = msgArray[0];

  if (!msg) return null;

  const instance = payload.instance || payload.instanceName || data.instance || data.instanceName || "unknown";
  const key = msg.key || {};
  const remoteJid = key.remoteJid;
  const messageId = key.id;
  const pushName = msg.pushName || data.pushName || payload.pushName;
  const message = msg.message || msg;
  const timestamp = msg.messageTimestamp || data.messageTimestamp || Math.floor(Date.now() / 1000);
  const fromMe = !!key.fromMe;

  return { instance, key, remoteJid, messageId, pushName, message, timestamp, fromMe };
}

// --- ROUTE ---

export const Route = createFileRoute("/api/public/whatsapp-evolution")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const start = Date.now();
        const config = await getEvolutionConfig();
        const url = new URL(request.url);
        
        // 1. AUTENTICAÇÃO
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
          await logEvent({ instance: "unknown", event: "webhook_received", status: "invalid_payload" });
          return new Response("Bad Request", { status: 400 });
        }

        await logEvent({ instance: payload.instance || "unknown", event: "webhook_received", status: "success" });

        // 2. NORMALIZAÇÃO DO EVENTO
        const rawEvent = (payload.event || "unknown").toLowerCase().replace(/_/g, ".");
        let normalizedEventName = rawEvent;
        if (rawEvent.includes("messages.upsert") || rawEvent.includes("message.upsert")) normalizedEventName = "messages.upsert";
        if (rawEvent.includes("connection.update")) normalizedEventName = "connection.update";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 3. CONNECTION UPDATE
        if (normalizedEventName === "connection.update") {
          const instance = payload.instance || payload.instanceName || payload.data?.instance || "unknown";
          const state = payload.data?.state || payload.state;
          if (state === "open" || state === "connected") {
            const { data: agente } = await supabaseAdmin.from("wa_agentes" as never).select("id, unidade_id").eq("instancia", instance).maybeSingle();
            if (agente) {
              const ag = agente as any;
              const newStatus = ag.unidade_id ? "ativo" : "conectado_sem_unidade";
              await supabaseAdmin.from("wa_agentes" as never).update({ status: newStatus, atualizado_em: new Date().toISOString() } as never).eq("id", ag.id);
            }
          }
          return new Response("OK");
        }

        if (normalizedEventName !== "messages.upsert") {
          return new Response("OK");
        }

        // 4. PROCESSAMENTO DE MENSAGENS
        const dataForNormalization = payload.data || payload;
        const messagesToProcess = Array.isArray(dataForNormalization) ? dataForNormalization : [dataForNormalization];

        for (const rawMsg of messagesToProcess) {
          const event = normalizeEvolutionMessage({ ...payload, data: rawMsg });
          if (!event) {
            await logEvent({ instance: "unknown", event: "message_normalized", status: "payload_shape_detected" });
            continue;
          }

          const { instance, remoteJid, pushName, message, timestamp, fromMe } = event;
          let { messageId } = event;

          await logEvent({ instance, event: "message_normalized", status: "success" });

          if (!remoteJid) {
            await logEvent({ instance, event: "validation", status: "missing_remote_jid", errorDetail: JSON.stringify(payload).slice(0, 500) });
            continue;
          }

          if (!messageId) {
            const textForHash = extractMessageText(message);
            messageId = `temp-${instance}-${remoteJid}-${timestamp}-${createHash("md5").update(textForHash).digest("hex").slice(0, 8)}`;
            await logEvent({ instance, messageId, event: "validation", status: "missing_message_id", errorDetail: "Generated temporary ID" });
          }

          if (fromMe) {
            await logEvent({ instance, messageId, event: "filter", status: "ignored_from_me" });
            continue;
          }

          if (remoteJid.includes("@g.us")) {
            await logEvent({ instance, messageId, event: "filter", status: "ignored_group" });
            continue;
          }

          if (remoteJid.includes("broadcast")) {
            await logEvent({ instance, messageId, event: "filter", status: "ignored_broadcast" });
            continue;
          }

          // IDEMPOTÊNCIA
          const { error: eventErr } = await supabaseAdmin.from("evo_events" as never).insert({ message_id: messageId, instance } as never);
          if (eventErr) {
            if (eventErr.code === "23505") {
              await logEvent({ instance, messageId, event: "idempotency", status: "duplicate_message" });
              continue;
            }
            await logEvent({ instance, messageId, event: "idempotency", status: "error", errorDetail: eventErr.message });
            continue;
          }

          const phone = normalizeWhatsAppPhone(remoteJid);
          const conversationKey = buildConversationKey(instance, phone);
          const contactName = normalizeContactName(pushName);
          const text = extractMessageText(message);

          if (!text) {
            await logEvent({ instance, messageId, event: "extraction", status: "empty_text" });
            continue;
          }

          // BUSCAR AGENTE
          const { data: agenteRow } = await supabaseAdmin.from("wa_agentes" as never).select("id, status, unidade_id").eq("instancia", instance).maybeSingle();
          const agente = agenteRow as any;
          if (!agente) {
            await logEvent({ instance, messageId, event: "agent_lookup", status: "agent_not_found" });
          } else if (!agente.unidade_id) {
            await logEvent({ instance, messageId, event: "agent_lookup", status: "agent_without_unit" });
          }

          // SALVAR MENSAGEM
          const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc("append_wa_message", {
            p_phone: conversationKey,
            p_message: { id: messageId, role: "user", parts: [{ type: "text", text }] },
            p_instance: instance,
            p_phone_number: phone,
            p_contact_name: contactName ?? undefined,
            p_increment_unread: true,
            p_new_status: (agente?.unidade_id && agente?.status === "ativo") ? "aberta" : "waiting_for_unit_selection"
          });

          if (rpcErr) {
            await logEvent({ instance, messageId, event: "persistence", status: "conversation_rpc_failed", errorDetail: rpcErr.message });
            continue;
          }
          await logEvent({ instance, messageId, event: "persistence", status: "message_saved" });

          // ATUALIZAR CONVERSA (AGENT/UNIT)
          if (agente) {
            const { error: updateErr } = await supabaseAdmin.from("wa_conversas" as never).update({ agent_id: agente.id, unidade_id: agente.unidade_id } as never).eq("phone", conversationKey);
            if (updateErr) {
              await logEvent({ instance, messageId, event: "persistence", status: "conversation_update_failed", errorDetail: updateErr.message });
            } else {
              await logEvent({ instance, messageId, event: "persistence", status: "conversation_update_ok" });
            }
          }

          // BLOQUEIO IA
          if (!agente || !agente.unidade_id || agente.status !== "ativo") {
            continue;
          }

          // EXECUTAR IA
          try {
            await logEvent({ instance, messageId, event: "ai_flow", status: "runAgent_started" });
            
            const { data: conv } = await supabaseAdmin.from("wa_conversas" as never).select("messages, customer_context, contact_name").eq("phone", conversationKey).maybeSingle();
            const existingConv = conv as any;
            
            // Histórico limpo: mensagens válidas, ordenadas, sem duplicadas (ID)
            const rawHistory = existingConv?.messages || [];
            const seenIds = new Set();
            const history = rawHistory
              .filter((m: any) => {
                if (!m.id || seenIds.has(m.id)) return false;
                seenIds.add(m.id);
                return true;
              })
              .slice(-10);

            await logEvent({ instance, messageId, event: "ai_flow", status: "history_loaded" });

            const modelMessages = history.map((m: any) => ({
              role: m.role === "operator" ? "assistant" : m.role,
              parts: [{ type: "text", text: extractConversationMessageText(m) }]
            }));
            
            // Garantir que a mensagem atual está no final se não for a última salva
            if (!modelMessages.some((m: any) => m.parts[0].text === text)) {
              modelMessages.push({ role: "user", parts: [{ type: "text", text }] });
            }

            const aiResponse = await runAgent(modelMessages, { 
              sandbox: false,
              unidadeId: agente.unidade_id,
              contactName: (contactName || existingConv?.contact_name) ?? undefined,
              contactPhone: phone,
              customerContext: existingConv?.customer_context || {}
            });
            
            if (aiResponse) {
              await logEvent({ instance, messageId, event: "evolution_send", status: "sendEvolution_started" });
              const sent = await sendEvolutionText(instance, phone, aiResponse);
              if (sent) {
                await supabaseAdmin.rpc("append_wa_message", {
                  p_phone: conversationKey,
                  p_message: { id: `ai-${Date.now()}`, role: "assistant", parts: [{ type: "text", text: aiResponse }] },
                  p_instance: instance,
                  p_phone_number: phone,
                  p_increment_unread: false
                });
                await logEvent({ instance, messageId, event: "ai_flow", status: "runAgent_finished" });
                await logEvent({ instance, messageId, event: "evolution_send", status: "sendEvolution_finished" });
              }
            }
          } catch (aiErr: any) {
            await logEvent({ instance, messageId, event: "ai_flow", status: "error", errorDetail: aiErr.message });
          }
        }

        return new Response("OK");
      }
    }
  }
});