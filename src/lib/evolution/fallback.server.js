import { sendEvolutionText } from "@/lib/evolution.server";
import { logEvent } from "./logger.server";
const FALLBACK_TEXT = "Estou com uma instabilidade momentânea aqui no atendimento automático 😔\n\nNossa equipe já foi avisada e vai te responder por aqui em instantes 💛";
/**
 * Acionado quando a IA falha (ex.: gateway indisponível / créditos esgotados).
 * Avisa o cliente uma única vez e move a conversa para triagem humana.
 */
export async function handleAIFallback(params) {
    try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: conv } = await supabaseAdmin
            .from("wa_conversas")
            .select("status, contact_name")
            .eq("phone", params.conversationKey)
            .maybeSingle();
        const alreadyEscalated = conv?.status === "aguardando_humano";
        // Move para triagem humana
        await supabaseAdmin
            .from("wa_conversas")
            .update({ status: "aguardando_humano" })
            .eq("phone", params.conversationKey);
        if (alreadyEscalated) {
            await logEvent({
                instance: params.instance,
                messageId: params.messageId,
                event: "ai_fallback",
                status: "already_escalated",
            });
            return;
        }
        // Registra na fila de atendimento humano
        await supabaseAdmin.from("atendimentos_humanos").insert({
            nome: params.contactName ?? conv?.contact_name ?? null,
            phone: params.phone,
            motivo: `IA indisponível: ${params.reason || "erro desconhecido"}`.slice(0, 300),
            canal: "whatsapp",
            status: "aguardando",
        });
        const sent = await sendEvolutionText(params.instance, params.phone, FALLBACK_TEXT);
        if (sent) {
            await supabaseAdmin.rpc("append_wa_message", {
                p_phone: params.conversationKey,
                p_message: {
                    id: `fallback-${Date.now()}`,
                    role: "assistant",
                    parts: [{ type: "text", text: FALLBACK_TEXT }],
                },
                p_instance: params.instance,
                p_phone_number: params.phone,
                p_increment_unread: false,
                p_new_status: "aguardando_humano",
                p_customer_context: null,
            });
        }
        await logEvent({
            instance: params.instance,
            messageId: params.messageId,
            event: "ai_fallback",
            status: sent ? "escalated_to_human" : "escalated_send_failed",
            errorDetail: params.reason ?? null,
        });
    }
    catch (err) {
        await logEvent({
            instance: params.instance,
            messageId: params.messageId,
            event: "ai_fallback",
            status: "error",
            errorDetail: err instanceof Error ? err.message : String(err),
        });
    }
}
