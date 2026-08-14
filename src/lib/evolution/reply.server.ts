import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { logEvent } from "./logger.server";
import { sendEvolutionText, sendEvolutionPresence } from "../evolution.server";
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
      
      // Validação de Preço (Manual também passa por auditoria se desejado, mas aqui mantemos o fluxo solicitado)
      trace.record("EVOLUTION_SEND_STARTED", { instance: params.instance });

      const sent = await sendEvolutionText(params.instance, params.phone, params.text, typingMs);

      if (sent) {
        const sentMessageId = sent.data?.key?.id || sent.data?.message?.key?.id || params.messageId || traceId;
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

  if (foundPrices && foundPrices.length > 0) {
    if (!params.resolvedPrice) {
      // REGRA 3: Se a Julia citou preço mas não há SERVICE_PRICE_RESOLVED
      trace.record("PRICE_MISMATCH_BLOCKED", {
        reason: "NO_RESOLVED_PRICE_CONTEXT",
        generatedText: params.text,
        traceId
      });
      console.warn(`[replyWithAI] PRICE_MISMATCH_BLOCKED: Citação de preço sem contexto resolvido. Text: ${params.text}`);
      
      // Fallback determinístico (Requisito 3)
      const fallbackText = "Vou confirmar o valor certinho para você. 💜";
      return replyWithAI({ ...params, text: fallbackText }, `${traceId}-fallback`);
    }

    // Validar se o preço citado bate com o oficial
    const officialPriceStr = params.resolvedPrice.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    
    for (const found of foundPrices) {
      const numericPart = found.replace(/[^\d,.]/g, '').replace(',', '.');
      const foundValue = parseFloat(numericPart);
      
      if (Math.abs(foundValue - params.resolvedPrice.price) > 0.01) {
        trace.record("PRICE_MISMATCH_BLOCKED", {
          officialPrice: params.resolvedPrice.price,
          generatedPrice: foundValue,
          serviceId: params.resolvedPrice.serviceId,
          traceId
        });
        console.error(`[replyWithAI] PRICE_MISMATCH_BLOCKED: Oficial=${params.resolvedPrice.price}, IA=${foundValue}`);
        
        // Se houver mismatch, forçamos a correção do texto ou fallback
        const correctedText = params.text.replace(found, `R$ ${officialPriceStr}`);
        trace.record("PRICE_AUTO_CORRECTED", { from: found, to: `R$ ${officialPriceStr}` });
        
        // Recomeça o envio com o texto corrigido
        return replyWithAI({ ...params, text: correctedText }, `${traceId}-corrected`);
      }
    }

    trace.record("PRICE_SENT", {
      serviceId: params.resolvedPrice.serviceId,
      officialPrice: params.resolvedPrice.price,
      sentPrice: foundPrices[0],
      traceId
    });
  }

  const typingMs = Math.min(Math.max(params.text.length * 30, 2000), 5000);

  await sendEvolutionPresence(
    params.instance,
    params.phone,
    "composing",
    typingMs,
  ).catch(() => false);

  trace.record("AI_RESPONSE_GENERATED", { textSnippet: params.text.slice(0, 50) });
  
  trace.record("EVOLUTION_SEND_STARTED", { instance: params.instance });
  const sentResult = await sendEvolutionText(params.instance, params.phone, params.text, typingMs);
  
  if (sentResult) {
    const sentMessageId = sentResult.data?.key?.id || sentResult.data?.message?.key?.id || params.messageId || traceId;
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
