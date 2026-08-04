import { createFileRoute } from "@tanstack/react-router";
import { runAgent } from "@/lib/chat.server";
import { getEvolutionConfig, sendEvolutionText } from "@/lib/evolution.server";

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
        const instancia = new URL(request.url).searchParams.get("instance") || "unknown";

        // 1. Webhook auth (Fail-closed)
        const provided = request.headers.get("x-webhook-secret") || request.headers.get("Authorization") || "";
        if (config.webhookSecret && provided !== config.webhookSecret) {
          await logEvent({ instance: instancia, event: "auth", status: "unauthorized" });
          return new Response("Unauthorized", { status: 401 });
        }

        const payload = await request.json().catch(() => null);
        if (!payload) return new Response("Bad Request", { status: 400 });

        // 2. Normalizar mensagens (Suporte a array v2.3.7)
        const messages = Array.isArray(payload.data) ? payload.data : [payload.data].filter(Boolean);
        if (messages.length === 0) return new Response("OK");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        for (const msg of messages) {
          const remoteJid = msg.key?.remoteJid;
          const messageId = msg.key?.id;
          if (!remoteJid || !messageId) continue;

          // Ignorar se for do próprio bot ou grupo
          if (msg.key.fromMe || remoteJid.includes("@g.us")) continue;

          const phone = remoteJid.split("@")[0].replace(/\D/g, "");
          const conversationId = `${instancia}:${phone}`;
          const contactName = msg.pushName || null;

          // Idempotência
          const { data: exists } = await supabaseAdmin.from("evo_events" as never).select("id").eq("message_id", messageId).maybeSingle();
          if (exists) continue;

          // Extrair texto (suporte a texto simples e estendido)
          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
          if (!text) continue;

          // 3. Salvar imediatamente e incrementar unread (Fail-closed)
          const msgObj = { id: messageId, role: "user", parts: [{ type: "text", text }] };
          const { error: rpcErr } = await supabaseAdmin.rpc("append_wa_message", {
            p_phone: conversationId,
            p_message: msgObj,
            p_instance: instancia,
            p_phone_number: phone,
            p_contact_name: contactName,
            p_increment_unread: true,
            p_new_status: "aberta"
          });

          if (rpcErr) {
            await logEvent({ instance: instancia, messageId, event: "save_db", status: "error", errorDetail: rpcErr.message });
            continue;
          }

          await supabaseAdmin.from("evo_events" as never).insert({ message_id: messageId, instance: instancia } as never);
          await logEvent({ instance: instancia, messageId, event: "message_processed", status: "success" });

          // 4. Executar IA e responder (async para não travar o webhook)
          try {
            const aiResponse = await runAgent([msgObj as any], { 
              sandbox: false,
              persona: contactName ? `O nome do cliente é ${contactName}.` : undefined
            });
            
            if (aiResponse) {
              const sent = await sendEvolutionText(instancia, phone, aiResponse);
              const aiMsg = { id: `ai-${Date.now()}`, role: "assistant", parts: [{ type: "text", text: aiResponse }] };
              
              await supabaseAdmin.rpc("append_wa_message", {
                p_phone: conversationId,
                p_message: aiMsg,
                p_instance: instancia,
                p_phone_number: phone,
                p_increment_unread: false
              });

              await logEvent({ 
                instance: instancia, 
                messageId, 
                event: "ai_response", 
                status: sent ? "success" : "error",
                durationMs: Date.now() - start 
              });
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