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
        if (!config.webhookSecret) {
          await logEvent({ instance: instancia, event: "auth", status: "secret_not_configured" });
          return new Response("Unauthorized", { status: 401 });
        }
        if (provided !== config.webhookSecret) {
          await logEvent({ instance: instancia, event: "auth", status: "unauthorized" });
          return new Response("Unauthorized", { status: 401 });
        }

        const payload = await request.json().catch(() => null);
        if (!payload) return new Response("Bad Request", { status: 400 });

        const event = (payload.event || "unknown").toLowerCase().replace(/_/g, ".");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Normalização do evento
        let normalizedEvent = event;
        if (event.includes("messages.upsert") || event.includes("messages_upsert")) normalizedEvent = "messages.upsert";

        // 3. DETECTAR A CONEXÃO DO WHATSAPP
        if (normalizedEvent === "connection.update") {
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
              await logEvent({ instance: instancia, event: ag.unidade_id ? "agent_connected" : "unit_selection_required", status: logEv }); // Item 12
            }
          }
          return new Response("OK");
        }

        if (normalizedEvent !== "messages.upsert") {
          return new Response("OK");
        }

        const messages = Array.isArray(payload.data) ? payload.data : [payload.data].filter(Boolean);
        if (messages.length === 0) return new Response("OK");

        await logEvent({ instance: instancia, event: "webhook_received", status: "processing" });

        for (const msg of messages) {
          const remoteJid = msg.key?.remoteJid;
          const messageId = msg.key?.id;
          if (!remoteJid || !messageId) continue;
          if (msg.key.fromMe || remoteJid.includes("@g.us") || remoteJid.includes("broadcast")) continue;

          const phone = remoteJid.split("@")[0].replace(/\D/g, "");
          const conversationId = `${instancia}:${phone}`;
          const contactName = msg.pushName || null;

          const { data: exists } = await supabaseAdmin.from("evo_events" as never).select("id").eq("message_id", messageId).maybeSingle();
          if (exists) continue;

          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
          if (!text) continue;

          await logEvent({ instance: instancia, messageId, event: "incoming_message_extracted", status: "success" });

          // Buscar agente e unidade
          const { data: agenteRow } = await supabaseAdmin
            .from("wa_agentes" as never)
            .select("id, status, unidade_id")
            .eq("instancia", instancia)
            .maybeSingle();
          
          const agente = agenteRow as any;
          
          // GRAVAR IMEDIATAMENTE a mensagem em wa_conversas (Item 5)
          await logEvent({ instance: instancia, messageId, event: "conversation_save_started", status: "pending" });
          
          const { error: rpcErr } = await supabaseAdmin.rpc("append_wa_message", {
            p_phone: conversationId,
            p_message: { id: messageId, role: "user", parts: [{ type: "text", text }] },
            p_instance: instancia,
            p_phone_number: phone,
            p_contact_name: contactName,
            p_increment_unread: true,
            p_new_status: (agente && agente.unidade_id && agente.status === "ativo") ? "aberta" : "waiting_for_unit_selection"
          });

          if (rpcErr) {
            await logEvent({ instance: instancia, messageId, event: "conversation_save_failed", status: "error", errorDetail: rpcErr.message });
            continue;
          }

          await logEvent({ instance: instancia, messageId, event: "message_saved", status: "success" });

          // Tentar vincular agente/unidade se existirem
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

          // Validações para IA movidas para DEPOIS de salvar
          if (!agente) {
            await logEvent({ instance: instancia, messageId, event: "agent_not_found", status: "skipped_ia" });
            continue;
          }

          if (!agente.unidade_id) {
            await logEvent({ instance: instancia, messageId, event: "agent_without_unit", status: "skipped_ia" }); // Item 12
            continue;
          }

          if (agente.status !== "ativo") {
            await logEvent({ instance: instancia, messageId, event: "agent_inactive", status: "skipped_ia" });
            continue;
          }

          // Chamar a IA (Item 11)
          try {
            await logEvent({ instance: instancia, messageId, event: "ai_started", status: "pending" });
            
            const aiResponse = await runAgent([{ id: messageId, role: "user", parts: [{ type: "text", text }] } as any], { 
              sandbox: false,
              persona: contactName ? `O nome do cliente é ${contactName}.` : undefined,
              unidadeId: agente.unidade_id
            });
            
            if (aiResponse) {
              const sent = await sendEvolutionText(instancia, phone, aiResponse);
              
              await supabaseAdmin.rpc("append_wa_message", {
                p_phone: conversationId,
                p_message: { id: `ai-${Date.now()}`, role: "assistant", parts: [{ type: "text", text: aiResponse }] },
                p_instance: instancia,
                p_phone_number: phone,
                p_increment_unread: false
              });

              await logEvent({ 
                instance: instancia, 
                messageId, 
                event: "ai_completed", 
                status: sent ? "success" : "evolution_send_failed",
                durationMs: Date.now() - start 
              });
              
              if (sent) {
                await logEvent({ instance: instancia, messageId, event: "evolution_send_completed", status: "success" });
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