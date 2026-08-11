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
  if (!conv) return { allowed: true };
  if (conv.attendance_mode === "HUMAN") return { allowed: false, reason: "ATTENDANCE_MODE_HUMAN" };
  if (conv.human_takeover_detected === true) return { allowed: false, reason: "HUMAN_TAKEOVER_DETECTED" };
  if (conv.ai_paused_at) return { allowed: false, reason: conv.ai_pause_reason || "AI_PAUSED" };
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
}) {


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
      const blockLog = {
        conversationId: params.conversationKey,
        phoneLast4: String(params.phone || "").slice(-4),
        unitId: params.unitId ?? (conv as any)?.unidade_id ?? null,
        timestamp: new Date().toISOString(),
        traceId,
        reason: gate.reason,
      };
      console.log(`[AI_RESPONSE_BLOCKED_HUMAN_MODE] ${JSON.stringify(blockLog)}`);
      await logEvent({
        instance: params.instance,
        messageId: params.messageId,
        event: "AI_RESPONSE_BLOCKED_HUMAN_MODE",
        status: "blocked",
        payload: blockLog
      });
      return false;
    }
  }


  const activeUnitId = params.unitId || conv?.unidade_id;
  const incomingInstance = conv?.instance || params.instance;

  // REGRA 4 & 5: Se o cliente NÃO pediu troca de unidade (parâmetro unitId ausente ou igual ao da conversa),
  // outboundInstance DEVE ser igual a inboundInstance.
  if (!params.unitId || params.unitId === conv?.unidade_id) {
    if (params.instance !== incomingInstance) {
      logger.info("OUTBOUND_INSTANCE_FORCED_BY_INBOUND", `Mantendo instância original do inbound para responder: ${params.instance} -> ${incomingInstance}`, {
        traceId,
        incomingInstance,
        currentInstance: params.instance
      });
      params.instance = incomingInstance;
    }
  } else if (activeUnitId) {
    // Somente se houver pedido explícito de troca de unidade (activeUnitId != conv.unidade_id)
    const outboundRes = await resolveOutboundInstanceForUnit(activeUnitId);
    if (!outboundRes) {
      // REGRA 6: Se o vínculo unitId estiver ausente mas inboundInstance for válida, não silenciar.
      if (incomingInstance) {
        logger.warn("UNIT_LINK_MISSING", `Vínculo de unidade ${activeUnitId} não resolvido, usando incomingInstance para não silenciar a Julia`, {
          traceId,
          incomingInstance,
          activeUnitId
        });
        params.instance = incomingInstance;
      } else {
        await logEvent({
          instance: params.instance,
          messageId: params.messageId,
          event: "OUTBOUND_INSTANCE_NOT_RESOLVED",
          status: "error",
          payload: { traceId, unitId: activeUnitId, conversationKey: params.conversationKey }
        });
        return false;
      }
    } else if (outboundRes.instanceId !== params.instance) {
      logger.info("OUTBOUND_INSTANCE_SWITCHED", `Trocando instância para corresponder à NOVA unidade: ${params.instance} -> ${outboundRes.instanceId}`, {
        traceId,
        unitId: activeUnitId,
        originalInstance: params.instance,
        newInstance: outboundRes.instanceId
      });
      params.instance = outboundRes.instanceId;
    }
  }

  // PROTEÇÃO FINAL DE SAÍDA: nenhuma mensagem do fluxo de assinatura pode mencionar CPF.
  try {
    const { enforceNoCpfInSubscriptionFlow, containsCpfSolicitation, PHONE_REQUEST_MESSAGE } = await import("@/lib/subscription-policy.server");
    
    // Detector rápido sem depender de Supabase
    const cpfRequested = containsCpfSolicitation(params.text);

    const ctx = (conv?.customer_context as any) || null;
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
          lookupStage: (ctx as { subscriptionLookupStage?: string } | null)?.subscriptionLookupStage ?? null,
        },
      });
    }
  } catch (error: any) {
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
    event: "OUTBOUND_STARTED", 
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
  const typingMs = Math.min(
    TYPING_MAX_MS,
    Math.max(TYPING_MIN_MS, params.text.length * TYPING_PER_CHAR_MS),
  );
  const typingSent = await sendEvolutionPresence(
    params.instance,
    params.phone,
    "composing",
    typingMs,
  ).catch(() => false);

  // 9. ENVIO ÚNICO PELA EVOLUTION
  const sent = await sendEvolutionText(params.instance, params.phone, params.text, typingMs);

  if (sent) {
    const sentMessageId = sent.data?.key?.id || sent.data?.message?.key?.id || params.messageId;
    
    await logEvent({ 
      instance: params.instance, 
      messageId: params.messageId,
      event: "MESSAGE_SENT", 
      status: "success",
      payload: { 
        traceId, 
        sentMessageId,
        outboundInstance: params.instance,
        outboundDestination: params.phone,
        evolutionResponse: sent.data,
        inboundInstance: params.instance, // Auditoria de igualdade
        destinationMatched: true // Validado pelo transporte Evolution
      }
    });

    // 10. PERSISTÊNCIA DA RESPOSTA (Atomicamente via RPC)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("append_wa_message" as any, {
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
  } else {
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
