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

        const provided = request.headers.get("x-webhook-secret") || request.headers.get("Authorization") || "";
        if (config.webhookSecret && provided !== config.webhookSecret) {
          await logEvent({ instance: instancia, event: "auth", status: "unauthorized" });
          return new Response("Unauthorized", { status: 401 });
        }

        const payload = await request.json().catch(() => null);
        if (!payload) return new Response("Bad Request", { status: 400 });

        const event = payload.event || "unknown";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 3. DETECTAR A CONEXÃO DO WHATSAPP (Item 3)
        if (event === "connection.update" || event === "CONNECTION_UPDATE") {
          const state = payload.data?.state || payload.state;
          if (state === "open" || state === "connected") {
            const { data: agente } = await supabaseAdmin
              .from("wa_agentes" as never)
              .select("id, unidade_id, status")
              .eq("instancia", instancia)
              .maybeSingle();
            
            if (agente) {
              const ag = agente as any;
              const newStatus = ag.unidade_id ? "ativo" : "conectado_sem_unidade";
              await supabaseAdmin
                .from("wa_agentes" as never)
                .update({ status: newStatus, atualizado_em: new Date().toISOString() } as never)
                .eq("id", ag.id);
              
              const logEv = ag.unidade_id ? "agent_reactivated" : "unit_selection_required";
              await logEvent({ instance: instancia, event: "whatsapp_connected", status: logEv });
            }
          }
          return new Response("OK");
        }

        if (event !== "messages.upsert" && event !== "MESSAGES_UPSERT") {
          return new Response("OK");
        }

        const messages = Array.isArray(payload.data) ? payload.data : [payload.data].filter(Boolean);
        if (messages.length === 0) return new Response("OK");

        for (const msg of messages) {
          const remoteJid = msg.key?.remoteJid;
          const messageId = msg.key?.id;
          if (!remoteJid || !messageId) continue;
          if (msg.key.fromMe || remoteJid.includes("@g.us")) continue;

          const phone = remoteJid.split("@")[0].replace(/\D/g, "");
          const conversationId = `${instancia}:${phone}`;
          const contactName = msg.pushName || null;

          const { data: exists } = await supabaseAdmin.from("evo_events" as never).select("id").eq("message_id", messageId).maybeSingle();
          if (exists) continue;

          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
          if (!text) continue;

          // Buscar agente e unidade (Item 6 & 10)
          const { data: agenteRow } = await supabaseAdmin
            .from("wa_agentes" as never)
            .select("id, status, unidade_id")
            .eq("instancia", instancia)
            .maybeSingle();
          
          const agente = agenteRow as any;
          const canProcessIA = agente && agente.status === "ativo" && agente.unidade_id;

          const msgObj = { id: messageId, role: "user", parts: [{ type: "text", text }] };
          const { error: rpcErr } = await supabaseAdmin.rpc("append_wa_message", {
            p_phone: conversationId,
            p_message: msgObj,
            p_instance: instancia,
            p_phone_number: phone,
            p_contact_name: contactName,
            p_increment_unread: true,
            p_new_status: canProcessIA ? "aberta" : "waiting_for_unit_selection"
          });

          if (rpcErr) {
            await logEvent({ instance: instancia, messageId, event: "save_db", status: "error", errorDetail: rpcErr.message });
            continue;
          }

          // Vincular unidade_id e agent_id na wa_conversas (Item 10)
          if (agente) {
             await supabaseAdmin
               .from("wa_conversas" as never)
               .update({ 
                 agent_id: agente.id, 
                 unidade_id: agente.unidade_id 
               } as never)
               .eq("phone", conversationId);
          }

          await supabaseAdmin.from("evo_events" as never).insert({ message_id: messageId, instance: instancia } as never);
          await logEvent({ instance: instancia, messageId, event: "message_processed", status: "success" });

          // 6. IMPEDIR A IA DE OPERAR SEM UNIDADE
          if (!canProcessIA) {
            if (agente && !agente.unidade_id) {
              await logEvent({ instance: instancia, messageId, event: "agent_without_unit", status: "skipped_ia" });
            }
            continue;
          }

          try {
            const aiResponse = await runAgent([msgObj as any], { 
              sandbox: false,
              persona: contactName ? `O nome do cliente é ${contactName}.` : undefined,
              unidadeId: agente.unidade_id // Passando unidadeId (Item 7)
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