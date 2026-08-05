import { createHash } from "crypto";
import { logEvent } from "./logger.server";
import { createAssistantResponseId } from "./trace";

export type ClaimResult = {
  claimed: boolean;
  reason: string;
  finalMessageId: string;
};

/**
 * Idempotência por (instance + message_id).
 * Não bloqueia eventos `failed` nem `processing` abandonado (> 2 min).
 */
export async function claimEvent(params: {
  instance: string;
  messageId: string | undefined;
  remoteJid: string;
  phone: string;
  timestamp: number;
  text: string;
  traceId?: string;
}): Promise<ClaimResult> {
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

  const { data, error } = await supabaseAdmin.rpc("evo_claim_event" as any, {
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

  const result = (data as any) || {};
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
export async function markResponsePending(instance: string, sourceMessageId: string): Promise<string> {
  const assistantResponseId = createAssistantResponseId(instance, sourceMessageId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("evo_events" as never)
    .update({
      assistant_response_id: assistantResponseId,
      assistant_response_status: "pending",
    } as never)
    .match({ instance, message_id: sourceMessageId } as never);
  return assistantResponseId;
}

/**
 * Reserva o slot de envio da resposta (garante 1 envio por mensagem de origem).
 * Retorna false apenas quando já existe um envio em andamento/concluído.
 */
export async function claimResponseSlot(instance: string, sourceMessageId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("evo_events" as never)
    .update({ assistant_response_status: "sending" } as never)
    .match({ instance, message_id: sourceMessageId } as never)
    .or("assistant_response_status.is.null,assistant_response_status.eq.pending,assistant_response_status.eq.failed")
    .select("id");

  if (error) return true; // não bloquear o atendimento por erro de infraestrutura
  return Array.isArray(data) ? data.length > 0 : true;
}

export async function markResponseFailed(instance: string, sourceMessageId: string, detail: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("evo_events" as never)
    .update({ assistant_response_status: "failed", error_detail: String(detail).slice(0, 500) } as never)
    .match({ instance, message_id: sourceMessageId } as never);
}

export async function markResponseSent(instance: string, messageId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("evo_events" as never)
    .update({
      status: "sent",
      assistant_response_status: "sent",
      processed_at: new Date().toISOString(),
    } as never)
    .match({ instance, message_id: messageId } as never);
}

export async function markEventProcessed(instance: string, messageId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("evo_events" as never)
    .update({ status: "processed", processed_at: new Date().toISOString() } as never)
    .match({ instance, message_id: messageId } as never)
    .neq("status" as never, "sent");
}

export async function markEventFailed(instance: string, messageId: string, detail: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("evo_events" as never)
    .update({
      status: "failed",
      error_detail: String(detail).slice(0, 500),
    } as never)
    .match({ instance, message_id: messageId } as never);
}
