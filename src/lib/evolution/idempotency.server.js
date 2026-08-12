import { createHash } from "crypto";
import { logEvent } from "./logger.server";
import { createAssistantResponseId } from "./trace";
/**
 * Idempotência por (instance + message_id).
 * Não bloqueia eventos `failed` nem `processing` abandonado (> 2 min).
 */
export async function claimEvent(params) {
    const { instance, remoteJid, phone, timestamp, text } = params;
    let finalMessageId = params.messageId;
    if (!finalMessageId || ["unknown", "undefined", ""].includes(finalMessageId)) {
        const hash = createHash("md5").update(text || "").digest("hex").slice(0, 8);
        finalMessageId = `temp-${instance}-${phone}-${timestamp}-${hash}`;
        await logEvent({
            instance,
            messageId: finalMessageId,
            event: "validation",
            status: "missing_message_id",
            errorDetail: "Generated temporary ID",
        });
    }
    const traceId = params.traceId || `${instance}:${finalMessageId}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("evo_claim_event", {
        p_instance: instance,
        p_message_id: finalMessageId,
        p_remote_jid: remoteJid,
        p_trace_id: traceId,
    });
    if (error) {
        await logEvent({
            instance,
            messageId: finalMessageId,
            event: "event_update_failed",
            status: "error",
            errorDetail: error.message,
            payload: { traceId },
        });
        // Fail-closed apenas neste caso extremo (erro de infraestrutura).
        return { claimed: false, reason: "claim_error", finalMessageId };
    }
    const result = data || {};
    const reason = String(result.reason || "unknown");
    await logEvent({
        instance,
        messageId: finalMessageId,
        event: result.claimed ? "event_registered" : "duplicate_message",
        status: result.claimed ? "success" : "skipped",
        payload: { traceId, reason },
    });
    if (reason === "stale_processing_recovered") {
        await logEvent({
            instance,
            messageId: finalMessageId,
            event: "stale_processing_recovered",
            status: "recovered",
            payload: { traceId },
        });
    }
    return { claimed: result.claimed === true, reason, finalMessageId };
}
/** Registra a resposta da IA como pendente de envio (após a IA responder). */
export async function markResponsePending(instance, sourceMessageId) {
    const assistantResponseId = createAssistantResponseId(instance, sourceMessageId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
        .from("evo_events")
        .update({
        assistant_response_id: assistantResponseId,
        assistant_response_status: "pending",
    })
        .match({ instance, message_id: sourceMessageId });
    return assistantResponseId;
}
/**
 * Reserva o slot de envio da resposta (garante 1 envio por mensagem de origem).
 * Retorna false apenas quando já existe um envio em andamento/concluído.
 */
export async function claimResponseSlot(instance, sourceMessageId) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
        .from("evo_events")
        .update({ assistant_response_status: "sending" })
        .match({ instance, message_id: sourceMessageId })
        .or("assistant_response_status.is.null,assistant_response_status.eq.pending,assistant_response_status.eq.failed")
        .select("id");
    if (error)
        return true; // não bloquear o atendimento por erro de infraestrutura
    return Array.isArray(data) ? data.length > 0 : true;
}
export async function markResponseFailed(instance, sourceMessageId, detail) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
        .from("evo_events")
        .update({ assistant_response_status: "failed", error_detail: String(detail).slice(0, 500) })
        .match({ instance, message_id: sourceMessageId });
}
export async function markResponseSent(instance, messageId) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
        .from("evo_events")
        .update({
        status: "sent",
        assistant_response_status: "sent",
        processed_at: new Date().toISOString(),
    })
        .match({ instance, message_id: messageId });
}
export async function markEventProcessed(instance, messageId) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
        .from("evo_events")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .match({ instance, message_id: messageId })
        .neq("status", "sent");
}
export async function markEventFailed(instance, messageId, detail) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
        .from("evo_events")
        .update({
        status: "failed",
        error_detail: String(detail).slice(0, 500),
    })
        .match({ instance, message_id: messageId });
}
