import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { runAgent } from "@/lib/chat.server";
import {
  getEvolutionConfig,
  sendEvolutionText,
} from "@/lib/evolution.server";

type Agente = {
  id: string;
  nome: string;
  tipo: "feminino" | "masculino";
  instancia: string;
  status?: string | boolean | null;
};

function personaNote(a: Agente): string {
  if (a.tipo === "masculino") {
    return `IDENTIDADE DESTE CANAL: você é ${a.nome}, recepcionista do Salão Seja Livre, homem, voz e escrita masculinas. Use concordância no masculino ao falar de si ("pronto", "obrigado"). Mantenha o mesmo tom acolhedor e humano.`;
  }
  return `IDENTIDADE DESTE CANAL: você é ${a.nome}, recepcionista do Salão Seja Livre, mulher, voz e escrita femininas.`;
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    if (x.length !== y.length) return false;
    return timingSafeEqual(x, y);
  } catch {
    return false;
  }
}

/** Log persistente e sem conteúdo sensível em evo_webhook_logs. */
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
      payload: null,
    } as never);
  } catch (err) {
    console.error("[evolution] log_persist_failed:", err);
  }
}

function isAgenteAtivo(a: Agente): boolean {
  const status = a.status;
  if (status === false) return false;
  if (status === true || status === null || status === undefined) return true;
  const s = String(status).trim().toLowerCase();
  if (["inativo", "inativa", "desativado", "desativada", "disabled", "inactive", "false", "0", "bloqueado", "suspenso"].includes(s)) {
    return false;
  }
  return true;
}

async function loadAgente(instancia: string): Promise<Agente | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = instancia.trim();
  const { data } = await supabaseAdmin
    .from("wa_agentes" as never)
    .select("id,nome,tipo,instancia,status")
    .eq("instancia", normalized)
    .maybeSingle();
  return (data as unknown as Agente | null) ?? null;
}

/**
 * Registra a tentativa de processamento de uma mensagem de forma atômica para idempotência.
 */
async function registerProcessed(instance: string, messageId: string, remoteJid?: string): Promise<{ success: boolean; isDuplicate: boolean; error?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    const { error } = await supabaseAdmin.from("evo_events" as never).insert({
      instance,
      message_id: messageId,
      remote_jid: remoteJid,
      status: "processing",
      created_at: new Date().toISOString()
    } as never);

    if (error) {
      if (error.code === "23505") { // Unique violation
        return { success: false, isDuplicate: true };
      }
      console.error("[evolution] idempotency_error:", error.message);
      return { success: false, isDuplicate: false, error: error.message };
    }
    return { success: true, isDuplicate: false };
  } catch (err) {
    console.error("[evolution] idempotency_exception:", err);
    return { success: false, isDuplicate: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function markCompleted(instance: string, messageId: string, status: "completed" | "error" = "completed") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("evo_events" as never).update({
    status,
    processed_at: new Date().toISOString()
  } as never).match({ instance, message_id: messageId });
}

function extractMessageText(message: any): string | null {
  if (!message) return null;

  // Recursão para mensagens encapsuladas
  const subMessage = 
    message.ephemeralMessage?.message || 
    message.viewOnceMessage?.message || 
    message.viewOnceMessageV2?.message || 
    message.documentWithCaptionMessage?.message || 
    message.editedMessage?.message ||
    message.protocolMessage?.editedMessage?.message;

  if (subMessage) {
    return extractMessageText(subMessage);
  }

  const text = 
    message.conversation || 
    message.extendedTextMessage?.text || 
    message.imageMessage?.caption || 
    message.videoMessage?.caption || 
    message.documentMessage?.caption || 
    message.buttonsResponseMessage?.selectedDisplayText || 
    message.buttonsResponseMessage?.selectedButtonId || 
    message.listResponseMessage?.title || 
    message.listResponseMessage?.singleSelectReply?.selectedRowId || 
    message.templateButtonReplyMessage?.selectedDisplayText || 
    message.templateButtonReplyMessage?.selectedId || 
    message.interactiveResponseMessage?.body?.text ||
    null;
    
  return text?.trim() || null;
}

export const Route = createFileRoute("/api/public/whatsapp-evolution")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({ ok: true, service: "whatsapp-evolution-webhook" });
      },
      POST: async ({ request }) => {
        const start = Date.now();
        const config = await getEvolutionConfig();
        const debug = config.debug;

        if (debug) console.log("[evolution] webhook_received");

        // 1. Autenticação do Webhook
        const provided = 
          request.headers.get("x-webhook-secret") ||
          (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "") ||
          new URL(request.url).searchParams.get("webhook_secret");

        if (config.webhookSecret) {
          if (!provided || !safeEqual(provided, config.webhookSecret)) {
            console.warn("[evolution] webhook_authenticated_failed: invalid secret");
            return new Response("Unauthorized", { status: 401 });
          }
          if (debug) console.log("[evolution] webhook_authenticated");
        } else {
          console.warn(
            "[evolution] webhook_secret_missing: o webhook está aceitando chamadas sem autenticação. Configure o segredo do webhook no painel (Config Evolution).",
          );
        }

        let payload: any;
        try {
          payload = await request.json();
        } catch (err) {
          console.error("[evolution] bad_json_error:", err);
          return new Response("Bad JSON", { status: 400 });
        }

        const rawEvent = (payload.event || "").toLowerCase().replace(/_/g, ".");
        let event = rawEvent;
        if (event === "messages.upsert" || event === "message.upsert" || event === "messages_upsert") {
          event = "messages.upsert";
        }
        if (debug) console.log("[evolution] payload_shape_detected", { event });

        const instancia = payload.instance || payload.instanceName || payload.data?.instance || payload.data?.instanceName || "unknown";
        if (debug) console.log("[evolution] instance_extracted", { instancia });

        if (event === "connection.update") {
          const state = payload.data?.state || payload.state;
          if (state === "open") {
             const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
             await supabaseAdmin.from("wa_agentes" as never).update({ status: "conectado", atualizado_em: new Date().toISOString() } as never).eq("instancia", instancia);
          }
          return Response.json({ ok: true });
        }

        if (event !== "messages.upsert") {
          return Response.json({ ok: true, ignored: true, reason: "unsupported_event", event: rawEvent });
        }

        // Normalização de mensagens (2.3.7 e variantes)
        let messagesArr: any[] = [];
        if (Array.isArray(payload.data)) {
          messagesArr = payload.data;
        } else if (payload.data?.key && payload.data?.message) {
          messagesArr = [payload.data]; // formato flat 2.3.7
        } else if (Array.isArray(payload.data?.messages)) {
          messagesArr = payload.data.messages;
        } else if (Array.isArray(payload.messages)) {
          messagesArr = payload.messages;
        } else if (payload.data) {
          messagesArr = [payload.data];
        }

        let hadInfraFailure = false;

        for (const msgData of messagesArr) {
          if (!msgData) continue;
          
          const key = msgData.key || {};
          const remoteJid = key.remoteJid || "";
          const messageId = key.id || "";
          const fromMe = key.fromMe === true;

          if (debug) console.log("[evolution] message_key_extracted", { messageId, remoteJid: remoteJid.replace(/\d+(?=@)/, (m: string) => m.slice(0, 4) + "****"), fromMe });

          if (fromMe) continue;

          if (!remoteJid) {
            console.warn("[evolution] missing_remote_jid", { messageId });
            continue;
          }

          if (!messageId) {
            console.warn("[evolution] missing_message_id", { remoteJid });
            continue;
          }

          if (remoteJid.endsWith("@g.us") || remoteJid.endsWith("@broadcast") || remoteJid === "status@broadcast") {
            continue;
          }

          const userText = extractMessageText(msgData.message);
          if (!userText) {
            if (debug) console.log("[evolution] message_ignored_empty_or_media", { messageId });
            continue;
          }

          await logEvent({ instance: instancia, messageId, event, status: "received" });

          // Idempotência fail-closed
          const { success: registered, isDuplicate, error: idemError } = await registerProcessed(instancia, messageId, remoteJid);
          if (isDuplicate) {
            console.warn("[evolution] duplicate_message", { messageId, instancia });
            await logEvent({ instance: instancia, messageId, event, status: "duplicate", durationMs: Date.now() - start });
            continue;
          }
          if (!registered) {
            hadInfraFailure = true;
            console.error("[evolution] idempotency_unavailable_skipping", { messageId, instancia });
            await logEvent({
              instance: instancia,
              messageId,
              event,
              status: "error",
              durationMs: Date.now() - start,
              errorDetail: `idempotency_unavailable: ${idemError ?? "unknown"}`,
            });
            continue;
          }

          if (debug) console.log("[evolution] agent_lookup_started", { instancia });
          const agente = await loadAgente(instancia);
          if (!agente) {
            console.warn("[evolution] agent_not_found", { instancia });
            await logEvent({ instance: instancia, messageId, event, status: "agent_not_found", durationMs: Date.now() - start });
            await markCompleted(instancia, messageId, "error");
            continue;
          }

          if (!isAgenteAtivo(agente)) {
            console.warn("[evolution] agent_inactive", { instancia, status: String(agente.status) });
            await logEvent({
              instance: instancia,
              messageId,
              event,
              status: "agent_inactive",
              durationMs: Date.now() - start,
              errorDetail: `status=${String(agente.status)}`,
            });
            await markCompleted(instancia, messageId, "error");
            continue;
          }

          const phone = remoteJid.split("@")[0].replace(/\D/g, "");
          const conversationId = `${instancia}:${phone}`; // Scoping histórico por instância e telefone

          const maskedPhone = phone.slice(0, 4) + "****" + phone.slice(-2);
          try {
            if (debug) console.log("[evolution] ai_started", { phone: maskedPhone });
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

            // 1) histórico da chave composta; 2) fallback legado (telefone puro)
            const { data: scopedHistory } = await supabaseAdmin
              .from("wa_conversas" as never)
              .select("messages")
              .eq("phone", conversationId)
              .maybeSingle();

            let historyData: any = scopedHistory;
            if (!historyData) {
              const { data: legacyHistory } = await supabaseAdmin
                .from("wa_conversas" as never)
                .select("messages")
                .eq("phone", phone)
                .maybeSingle();
              historyData = legacyHistory;
            }

            const history = Array.isArray((historyData as any)?.messages) ? (historyData as any).messages : [];
            const nextIn = [...history, { id: `u-${Date.now()}`, role: "user", parts: [{ type: "text", text: userText }] }];

            let reply: string;
            try {
              reply = await runAgent(nextIn, { persona: personaNote(agente) });
            } catch (aiErr: any) {
              await logEvent({
                instance: instancia,
                messageId,
                event,
                status: "ai_error",
                durationMs: Date.now() - start,
                errorDetail: String(aiErr?.message ?? aiErr),
              });
              throw aiErr;
            }
            if (debug) console.log("[evolution] ai_completed", { duration: Date.now() - start });

            await supabaseAdmin.from("wa_conversas" as never).upsert({ 
              phone: conversationId, // Sempre o identificador composto
              messages: [...nextIn, { id: `a-${Date.now()}`, role: "assistant", parts: [{ type: "text", text: reply }] }].slice(-40),
              updated_at: new Date().toISOString() 
            } as never);

            if (debug) console.log("[evolution] evolution_send_started", { phone: maskedPhone });
            const sent = await sendEvolutionText(instancia, phone, reply);
            if (debug) console.log("[evolution] evolution_send_completed", { sent });

            await logEvent({
              instance: instancia,
              messageId,
              event,
              status: sent ? "success" : "evolution_send_error",
              durationMs: Date.now() - start,
              errorDetail: sent ? null : "falha ao enviar mensagem pela Evolution API",
            });

            await markCompleted(instancia, messageId, sent ? "completed" : "error");

          } catch (err: any) {
            console.error("[evolution] process_failed:", err);
            await logEvent({
              instance: instancia,
              messageId,
              event,
              status: "error",
              durationMs: Date.now() - start,
              errorDetail: String(err?.message ?? err),
            });
            await markCompleted(instancia, messageId, "error");
          }
        }

        if (hadInfraFailure) {
          return new Response(
            JSON.stringify({ ok: false, error: "idempotency_unavailable", duration_ms: Date.now() - start }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        return Response.json({ ok: true, duration_ms: Date.now() - start });
      }
    }
  }
});
