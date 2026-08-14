import { sendEvolutionText, sendEvolutionPresence } from "@/lib/evolution.server";
import { logEvent } from "./logger.server";
import { logger } from "@/lib/observability/logger.server";
import { resolveOutboundInstanceForUnit, validateOutboundInstance } from "./outbound-resolver.server";




// Duração do indicador nativo "digitando…" antes do envio da resposta.
const TYPING_MIN_MS = 1200;
const TYPING_MAX_MS = 3500;
const TYPING_PER_CHAR_MS = 25;

/**
 * PROTEÇÃO FINAL (fail-closed): nenhuma mensagem automática pode sair
 * enquanto a conversa estiver em atendimento humano.
 */
export function ensureAIAllowedToReply(conv: any): { allowed: boolean; reason?: string } {
  if (!conv) {
    console.log("[AI_GLOBAL_STATE] No conversation context found, allowing AI by default (Fail-Open for missing records)");
    return { allowed: true };
  }
  
  // LOG DE AUDITORIA DE ESTADO
  console.log(`[CONVERSATION_MODE_CHECKED] conversationId=${conv.phone || 'unknown'} mode=${conv.attendance_mode} paused=${!!conv.ai_paused_at}`);

  if (conv.attendance_mode === "HUMAN") return { allowed: false, reason: "ATTENDANCE_MODE_HUMAN" };
  if (conv.human_takeover_detected === true) return { allowed: false, reason: "HUMAN_TAKEOVER_DETECTED" };
  if (conv.ai_paused_at) return { allowed: false, reason: conv.ai_pause_reason || "AI_PAUSED" };
  
  console.log(`[AI_ALLOWED_FOR_CONVERSATION] conversationId=${conv.phone}`);
  return { allowed: true };
}


export async function replyToUser(params: {
  instance: string;
  phone: string;
  text: string;
  conversationKey: string;
  messageId?: string;
  traceId?: string;
  unitId?: string | null;
  allowDuringHumanMode?: boolean;
  _trace?: any;
}) {
  const trace = params._trace;
  const traceId = params.traceId || trace?.getTraceId() || `${params.instance}:${params.messageId || Math.random().toString(36).substring(7)}`;

  // PROTEÇÃO DE INSTÂNCIA POR UNIDADE
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: conv } = await supabaseAdmin
    .from("wa_conversas")
    .select("unidade_id, instance, attendance_mode, customer_context, human_takeover_detected, ai_paused_at, ai_pause_reason")
    .eq("phone", params.conversationKey)
    .maybeSingle();

  // PROTEÇÃO FINAL FAIL-CLOSED: bloquear qualquer outbound automático em modo humano
  if (!params.allowDuringHumanMode) {
    const gate = ensureAIAllowedToReply(conv as any);
    if (!gate.allowed) {
      trace?.record("MESSAGE_PROCESSING_ABORTED", { 
        stage: "OUTBOUND_INSTANCE_RESOLVED", 
        reason: gate.reason || "human_takeover",
        traceId: params.traceId,
        conversationId: params.conversationKey
      });
      trace?.record("AI_RESPONSE_BLOCKED", { reason: gate.reason });
      return false;
    }

  }

  const incomingInstance = conv?.instance || params.instance;

  // REGRA: outboundInstance DEVE ser igual a inboundInstance.
  if (!params.unitId || params.unitId === conv?.unidade_id) {
    if (params.instance !== incomingInstance) {
      trace?.record("INSTANCE_MISMATCH", { 
        incoming: incomingInstance, 
        current: params.instance,
        action: "force_inbound_instance"
      });
      params.instance = incomingInstance;
    }
  } else if (params.unitId) {
    const outboundRes = await resolveOutboundInstanceForUnit(params.unitId);
    if (outboundRes && outboundRes.instanceId !== params.instance) {
      trace?.record("INSTANCE_MISMATCH", { 
        requested_unit: params.unitId,
        current: params.instance,
        new: outboundRes.instanceId
      });
      params.instance = outboundRes.instanceId;
    } else if (!outboundRes && incomingInstance) {
      params.instance = incomingInstance;
    }
  }


  // Idempotência de envio
  if (params.messageId) {
    const { claimResponseSlot } = await import("./idempotency.server");
    const allowed = await claimResponseSlot(params.instance, params.messageId);
    if (!allowed) {
      trace?.record("MESSAGE_PROCESSING_ABORTED", { 
        stage: "IDEMPOTENCY_CHECK", 
        reason: "duplicate_response_slot",
        traceId: params.traceId
      });
      trace?.record("DUPLICATE_RESPONSE_PREVENTED");
      return false;
    }

  }

  // Digitação humanizada
  const typingMs = Math.min(
    TYPING_MAX_MS,
    Math.max(TYPING_MIN_MS, params.text.length * TYPING_PER_CHAR_MS),
  );
  
  trace?.record("EVOLUTION_SEND_STARTED", { instance: params.instance });
  await sendEvolutionPresence(
    params.instance,
    params.phone,
    "composing",
    typingMs,
  ).catch(() => false);

  // 9. ENVIO ÚNICO PELA EVOLUTION
  const sent = await sendEvolutionText(params.instance, params.phone, params.text, typingMs);
  trace?.record("EVOLUTION_SEND_COMPLETED", { success: !!sent });

  if (sent) {
    const sentMessageId = sent.data?.key?.id || sent.data?.message?.key?.id || params.messageId;
    trace?.record("MESSAGE_SENT", { sentMessageId });

    // 10. PERSISTÊNCIA DA RESPOSTA (Atomicamente via RPC)
    // A mensagem JÁ foi confirmada pela Evolution: uma falha aqui NUNCA pode
    // lançar erro (isso provocaria reenvio duplicado). Apenas registramos.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      const { error } = await supabaseAdmin.rpc("append_wa_message" as any, {
        p_phone: params.conversationKey,
        p_new_message: { 
          id: `${params.instance}:${params.messageId}:assistant`, 
          role: "assistant", 
          parts: [{ type: "text", text: params.text }] 
        }
      });
      if (error) throw new Error(error.message);
    } catch (persistError: any) {
      trace?.record("AI_REPLY_HISTORY_PERSISTENCE_FAILED", {
        traceId,
        conversationId: params.conversationKey,
        error: persistError?.message,
      });
      await logEvent({
        instance: params.instance,
        messageId: sentMessageId,
        event: "AI_REPLY_HISTORY_PERSISTENCE_FAILED",
        status: "error",
        errorDetail: persistError?.message,
        payload: { traceId, conversationKey: params.conversationKey },
      }).catch(() => {});
    }

    if (params.messageId) {
      const { markResponseSent } = await import("./idempotency.server");
      await markResponseSent(params.instance, params.messageId);
    }

    return true;
  } else {
    // Requisito 3: Falhas no envio devem lançar erro e marcar status
    if (params.messageId) {
      const { markResponseFailed } = await import("./idempotency.server");
      await markResponseFailed(params.instance, params.messageId, "evolution_send_failed");
    }
    
    throw new Error(`EVOLUTION_REPLY_SEND_FAILED: Failed to send message via instance ${params.instance}`);
  }
}
