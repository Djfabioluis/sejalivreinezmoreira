import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { logEvent } from "./logger.server";
import { sendEvolutionPresence } from "../evolution.server";
import { EvolutionService } from "./evolution-service.server";
import { PerformanceTrace } from "./performance.server";

export const sendManualWAMessage = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({
    instance: z.string(),
    phone: z.string(),
    text: z.string(),
    conversationKey: z.string(),
    messageId: z.string().optional(),
  }).parse(data))
  .handler(async ({ data: params }) => {
    const traceId = `manual-${Date.now()}`;
    const trace = new PerformanceTrace({
      traceId,
      instanceId: params.instance,
      conversationId: params.conversationKey
    });
    
    try {
      const typingMs = Math.min(Math.max(params.text.length * 20, 1000), 3000);
      
      await sendEvolutionPresence(
        params.instance,
        params.phone,
        "composing",
        typingMs,
      ).catch(() => false);

      trace.record("AI_RESPONSE_GENERATED", { textSnippet: params.text.slice(0, 50) });
      
      trace.record("EVOLUTION_SEND_STARTED", { instance: params.instance });

      const sent = await EvolutionService.sendText({
        instance: params.instance,
        to: params.phone,
        text: params.text,
        typingMs,
        module: "manual"
      });

      if (sent) {
        const sentMessageId = params.messageId || traceId;
        trace.record("EVOLUTION_SEND_SUCCESS", { evolutionId: sentMessageId });
        trace.record("MESSAGE_SENT", { sentMessageId });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        try {
          const { error } = await supabaseAdmin.rpc("append_wa_message" as any, {
            p_phone: params.conversationKey,
            p_new_message: { 
              id: `${params.instance}:${sentMessageId}:assistant`, 
              role: "assistant", 
              parts: [{ type: "text", text: params.text }],
              createdAt: new Date().toISOString()
            }
          });
          if (error) throw new Error(error.message);
        } catch (persistError: any) {
          trace.record("AI_REPLY_HISTORY_PERSISTENCE_FAILED", {
            traceId,
            conversationId: params.conversationKey,
            error: persistError?.message,
          });
        }

        return { success: true, messageId: sentMessageId };
      } else {
        throw new Error(`EVOLUTION_SEND_FAILED: Failed to send message via instance ${params.instance}`);
      }
    } catch (error: any) {
      console.error("[sendManualWAMessage] Error:", error);
      return { success: false, error: error.message };
    }
  });

export interface ReplyParams {
  instance: string;
  phone: string;
  text: string;
  conversationKey: string;
  messageId?: string;
  unitId?: string | null;
  allowDuringHumanMode?: boolean;
  _trace?: PerformanceTrace;
  resolvedPrice?: {
    serviceId: string;
    serviceName: string;
    price: number;
    unitId: string;
    source: string;
  } | null;
  resolvedPrices?: Array<{
    serviceId: string;
    serviceName: string;
    price: number;
    unitId: string;
    source: string;
  }>;
}

export async function replyToUser(params: ReplyParams) {
  const traceId = `reply-${Date.now()}`;
  return replyWithAI(params, traceId);
}

export async function replyWithAI(params: ReplyParams, traceId: string) {
  const trace = params._trace || new PerformanceTrace({
    traceId,
    instanceId: params.instance,
    conversationId: params.conversationKey
  });

  // ==================================================
  // VALIDAÇÃO DETERMINÍSTICA DE PREÇO (REQUISITO 5)
  // ==================================================
  const priceRegex = /R\$\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g;
  const foundPrices = params.text.match(priceRegex);

  // REGRA DE AMBIGUIDADE (src/lib/booking/context.ts flag clarificationRequired)
  const isClarificationRequired = (params as any).clarificationRequired === true;

  if (foundPrices && foundPrices.length > 0) {
    if (isClarificationRequired) {
      trace.record("PRICE_MISMATCH_BLOCKED", {
        reason: "SERVICE_AMBIGUITY_PENDING",
        generatedText: params.text,
        traceId
      });
      console.warn(`[replyWithAI] PRICE_MISMATCH_BLOCKED: Citação de preço em estado de ambiguidade.`);
      const fallbackText = "Temos algumas opções disponíveis. Qual delas você deseja? 💜";
      return replyWithAI({ ...params, text: fallbackText }, `${traceId}-ambiguity-fallback`);
    }

    const resolvedPrices = params.resolvedPrices || (params.resolvedPrice ? [params.resolvedPrice] : []);

    if (resolvedPrices.length === 0) {
      trace.record("PRICE_MISMATCH_BLOCKED", {
        reason: "NO_RESOLVED_PRICE_CONTEXT",
        generatedText: params.text,
        traceId
      });
      console.warn(`[replyWithAI] PRICE_MISMATCH_BLOCKED: Citação de preço sem contexto resolvido. Text: ${params.text}`);
      const fallbackText = "Vou confirmar o valor certinho para você. 💜";
      return replyWithAI({ ...params, text: fallbackText }, `${traceId}-fallback`);
    }

    for (const found of foundPrices) {
      const numericPart = found.replace(/[^\d,.]/g, '').replace(',', '.');
      const foundValue = parseFloat(numericPart);
      const officialMatch = resolvedPrices.find(p => Math.abs(foundValue - p.price) < 0.01);
      
      if (!officialMatch) {
        trace.record("PRICE_MISMATCH_BLOCKED", {
          availablePrices: resolvedPrices.map(p => p.price),
          generatedPrice: foundValue,
          traceId
        });
        console.error(`[replyWithAI] PRICE_MISMATCH_BLOCKED: IA=${foundValue}, No official match found.`);
        
        if (resolvedPrices.length === 1) {
          const officialPriceStr = resolvedPrices[0].price.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
          const correctedText = params.text.replace(found, `R$ ${officialPriceStr}`);
          trace.record("PRICE_AUTO_CORRECTED", { from: found, to: `R$ ${officialPriceStr}` });
          return replyWithAI({ ...params, text: correctedText }, `${traceId}-corrected`);
        }
        const fallbackText = "Vou confirmar o valor certinho para você. 💜";
        return replyWithAI({ ...params, text: fallbackText }, `${traceId}-fallback-mismatch`);
      }
    }

    trace.record("PRICE_SENT", {
      serviceCount: resolvedPrices.length,
      officialPrices: resolvedPrices.map(p => p.price),
      traceId
    });
  }

  return proceedWithSend(params, trace, traceId);
}

async function proceedWithSend(params: ReplyParams, trace: PerformanceTrace, traceId: string) {
  const typingMs = Math.min(Math.max(params.text.length * 30, 2000), 5000);

  await sendEvolutionPresence(
    params.instance,
    params.phone,
    "composing",
    typingMs,
  ).catch(() => false);

  trace.record("AI_RESPONSE_GENERATED", { textSnippet: params.text.slice(0, 50) });
  trace.record("EVOLUTION_SEND_STARTED", { instance: params.instance });
  
  // REGRA DE OURO DE IDEMPOTÊNCIA OUTBOUND: 
  // Nunca enviar sem marcar o início do envio para evitar corridas.
  if (params.messageId) {
    const { claimResponseSlot } = await import("./idempotency.server");
    const canSend = await claimResponseSlot(params.instance, params.messageId);
    if (!canSend) {
      trace.record("OUTBOUND_BLOCKED_DUPLICATE", { 
        reason: "response_slot_already_claimed", 
        messageId: params.messageId 
      });
      // Permite o processamento continuar sem erro para o caller, mas sem disparar o envio físico.
      trace.record("TOTAL_PROCESSING_COMPLETED", { reason: "duplicate_outbound_prevented" });
      return true; 
    }
  }

  // ANTI-DUPLICAÇÃO POR CONTEÚDO: nunca repetir o MESMO texto para a MESMA
  // conversa dentro de 3 minutos (protege contra retries com messageId distinto).
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: conv } = await supabaseAdmin
      .from("wa_conversas" as never)
      .select("messages")
      .eq("phone" as never, params.conversationKey)
      .maybeSingle();
    const messages = (((conv as any)?.messages as any[]) || []).slice(-8);
    const cutoff = Date.now() - 3 * 60 * 1000;
    const duplicated = messages.some((m: any) => {
      if (m?.role !== "assistant") return false;
      const created = m?.createdAt ? Date.parse(m.createdAt) : 0;
      if (!created || created < cutoff) return false;
      const body = (m?.parts || []).map((pt: any) => pt?.text || "").join("");
      return body.trim() === params.text.trim();
    });
    if (duplicated) {
      trace.record("OUTBOUND_BLOCKED_DUPLICATE", {
        reason: "identical_text_within_window",
        conversationKey: params.conversationKey,
        textSnippet: params.text.slice(0, 50)
      });
      console.warn("[proceedWithSend] Bloqueando envio duplicado por conteúdo idêntico recente.");
      // Retornamos TRUE aqui porque o "bloqueio lógico" é um sucesso de processamento da IA,
      // impedindo que o agent.server.ts dispare retries ou marque falha.
      return true;
    }
  } catch (dedupeErr: any) {
    trace.record("OUTBOUND_DEDUPE_CHECK_FAILED", { error: dedupeErr?.message });
  }

  const sentResult = await EvolutionService.sendText({
    instance: params.instance,
    to: params.phone,
    text: params.text,
    typingMs,
    module: "julia-ai"
  });
  
  if (sentResult) {
    const sentMessageId = params.messageId || traceId;
    trace.record("EVOLUTION_SEND_SUCCESS", { evolutionId: sentMessageId });
    trace.record("MESSAGE_SENT", { sentMessageId });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      const { error } = await supabaseAdmin.rpc("append_wa_message" as any, {
        p_phone: params.conversationKey,
        p_new_message: { 
          id: `${params.instance}:${sentMessageId}:assistant`, 
          role: "assistant", 
          parts: [{ type: "text", text: params.text }],
          createdAt: new Date().toISOString()
        }
      });
      if (error) throw new Error(error.message);
    } catch (persistError: any) {
      trace.record("AI_REPLY_HISTORY_PERSISTENCE_FAILED", {
        traceId,
        conversationId: params.conversationKey,
        error: persistError?.message,
      });
    }

    if (params.messageId) {
      const { markResponseSent } = await import("./idempotency.server");
      await markResponseSent(params.instance, params.messageId);
    }
    return true;
  } else {
    if (params.messageId) {
      const { markResponseFailed } = await import("./idempotency.server");
      await markResponseFailed(params.instance, params.messageId, "evolution_send_failed");
    }
    throw new Error(`EVOLUTION_REPLY_SEND_FAILED: Failed to send message via instance ${params.instance}`);
  }
}

export function ensureAIAllowedToReply(conv: any) {
  const isHuman = conv?.attendance_mode === 'HUMAN' || !!conv?.ai_paused_at;
  if (isHuman) {
    return { allowed: false, reason: "human_mode" };
  }
  return { allowed: true };
}
