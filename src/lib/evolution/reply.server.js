import { sendEvolutionText, sendEvolutionPresence } from "@/lib/evolution.server";
import { logEvent } from "./logger.server";
import { logger } from "@/lib/observability/logger.server";
// Duração do indicador nativo "digitando…" antes do envio da resposta.
const TYPING_MIN_MS = 1200;
const TYPING_MAX_MS = 3500;
const TYPING_PER_CHAR_MS = 25;
export async function replyToUser(params) {
    const traceId = params.traceId || `${params.instance}:${params.messageId || Math.random().toString(36).substring(7)}`;
    // INSTRUMENTAÇÃO DE AUDITORIA: registrar origem da resposta
    const stack = new Error().stack;
    logger.audit("OUTBOUND_MESSAGE_SOURCE", `Enviando mensagem para Evolution via replyToUser`, {
        traceId,
        conversationKey: params.conversationKey,
        instance: params.instance,
        textSnippet: params.text.slice(0, 100),
        source_file: "src/lib/evolution/reply.server.ts",
        source_function: "replyToUser",
        stack
    });
    if (params.text.includes("CPF")) {
        logger.audit("CPF_RESPONSE_GENERATED", `Uma resposta contendo CPF foi detectada em replyToUser`, {
            traceId,
            conversationKey: params.conversationKey,
            text: params.text,
            stack
        });
    }
    // PROTEÇÃO FINAL DE SAÍDA: nenhuma mensagem do fluxo de assinatura pode mencionar CPF.
    try {
        const { enforceNoCpfInSubscriptionFlow, containsCpfSolicitation, PHONE_REQUEST_MESSAGE } = await import("@/lib/subscription-policy.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // Detector rápido sem depender de Supabase
        const cpfRequested = containsCpfSolicitation(params.text);
        const { data: conv } = await supabaseAdmin
            .from("wa_conversas")
            .select("customer_context")
            .eq("phone", params.conversationKey)
            .maybeSingle();
        const ctx = conv?.customer_context || null;
        const enforced = enforceNoCpfInSubscriptionFlow(params.text, ctx);
        if (enforced.blocked) {
            params = { ...params, text: enforced.text };
            await logEvent({
                instance: params.instance,
                messageId: params.messageId,
                event: "subscription_cpf_blocked_at_reply",
                status: "blocked",
                payload: {
                    traceId,
                    lookupStage: ctx?.subscriptionLookupStage ?? null,
                },
            });
        }
    }
    catch (error) {
        // FAIL-CLOSED: Se a proteção falhar, mas o texto contiver CPF, bloqueamos.
        const { containsCpfSolicitation, PHONE_REQUEST_MESSAGE } = await import("@/lib/subscription-policy.server");
        if (containsCpfSolicitation(params.text)) {
            params.text = PHONE_REQUEST_MESSAGE;
            logger.error("SUBSCRIPTION_PROTECTION_FAILED_FAIL_CLOSED", error.message, { traceId });
            await logEvent({
                instance: params.instance,
                messageId: params.messageId,
                event: "subscription_policy_check_failed",
                status: "warning",
                payload: { traceId }
            });
        }
    }
    await logEvent({
        instance: params.instance,
        messageId: params.messageId,
        event: "evolution_send_started",
        status: "started",
        payload: { traceId }
    });
    // Idempotência de envio: apenas um envio por mensagem de origem
    if (params.messageId) {
        const { claimResponseSlot } = await import("./idempotency.server");
        const allowed = await claimResponseSlot(params.instance, params.messageId);
        if (!allowed) {
            await logEvent({
                instance: params.instance,
                messageId: params.messageId,
                event: "duplicate_response_prevented",
                status: "skipped",
                payload: { traceId },
            });
            return false;
        }
    }
    // Digitação humanizada
    const typingMs = Math.min(TYPING_MAX_MS, Math.max(TYPING_MIN_MS, params.text.length * TYPING_PER_CHAR_MS));
    const typingSent = await sendEvolutionPresence(params.instance, params.phone, "composing", typingMs).catch(() => false);
    // 9. ENVIO ÚNICO PELA EVOLUTION
    const sent = await sendEvolutionText(params.instance, params.phone, params.text, typingMs);
    if (sent) {
        await logEvent({
            instance: params.instance,
            messageId: params.messageId,
            event: "evolution_send_completed",
            status: "success",
            payload: { traceId }
        });
        // 10. PERSISTÊNCIA DA RESPOSTA (Atomicamente via RPC)
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.rpc("append_wa_message", {
            p_phone: params.conversationKey,
            p_message: {
                id: `${params.instance}:${params.messageId}:assistant`,
                role: "assistant",
                parts: [{ type: "text", text: params.text }]
            },
            p_instance: params.instance,
            p_phone_number: params.phone,
            p_increment_unread: false,
            p_new_status: "aberta",
            p_customer_context: null
        });
        if (error) {
            await logEvent({
                instance: params.instance,
                messageId: params.messageId,
                event: "assistant_message_save_failed",
                status: "error",
                errorDetail: error.message,
                payload: { traceId }
            });
            return false;
        }
        if (params.messageId) {
            const { markResponseSent } = await import("./idempotency.server");
            await markResponseSent(params.instance, params.messageId);
        }
        return true;
    }
    else {
        await logEvent({
            instance: params.instance,
            messageId: params.messageId,
            event: "evolution_send_failed",
            status: "failed",
            payload: { traceId }
        });
        if (params.messageId) {
            const { markResponseFailed } = await import("./idempotency.server");
            await markResponseFailed(params.instance, params.messageId, "evolution_send_failed");
        }
        return false;
    }
}
