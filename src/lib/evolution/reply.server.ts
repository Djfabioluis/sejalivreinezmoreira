import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { logEvent } from "./logger.server";
import { sendEvolutionText, sendEvolutionPresence } from "../evolution.server";
import { performanceTrace } from "./performance.server";

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
    const trace = performanceTrace(traceId, params.instance);
    
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

      // 9. ENVIO ÚNICO PELA EVOLUTION
      const sent = await sendEvolutionText(params.instance, params.phone, params.text, typingMs);

      if (sent) {
        const sentMessageId = sent.data?.key?.id || sent.data?.message?.key?.id || params.messageId || traceId;
        trace.record("EVOLUTION_SEND_SUCCESS", { evolutionId: sentMessageId });
        trace.record("MESSAGE_SENT", { sentMessageId });

        // 10. PERSISTÊNCIA DA RESPOSTA (Atomicamente via RPC)
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
          await logEvent({
            instance: params.instance,
            messageId: sentMessageId,
            event: "AI_REPLY_HISTORY_PERSISTENCE_FAILED",
            status: "error",
            errorDetail: persistError?.message,
            payload: { traceId, conversationKey: params.conversationKey },
          }).catch(() => {});
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
}

/**
 * Envia uma resposta da IA via Evolution API com resiliência total.
 * Requisito 3: A falha na persistência do histórico não bloqueia o envio.
 */
export async function replyWithAI(params: ReplyParams, traceId: string) {
  const trace = performanceTrace(traceId, params.instance);
  const typingMs = Math.min(Math.max(params.text.length * 30, 2000), 5000);

  // 8. PRESENÇA (Composing...)
  await sendEvolutionPresence(
    params.instance,
    params.phone,
    "composing",
    typingMs,
  ).catch(() => false);

  trace.record("AI_RESPONSE_GENERATED", { textSnippet: params.text.slice(0, 50) });
  
  // Requisito 3: REGRA CRÍTICA DE RESILIÊNCIA
  // O envio pela Evolution DEVE ocorrer mesmo se a persistência falhar.
  trace.record("EVOLUTION_SEND_STARTED", { instance: params.instance });
  const sentResult = await sendEvolutionText(params.instance, params.phone, params.text, typingMs);
  
  if (sentResult) {
    const sentMessageId = sentResult.data?.key?.id || sentResult.data?.message?.key?.id || params.messageId || traceId;
    trace.record("EVOLUTION_SEND_SUCCESS", { evolutionId: sentMessageId });
    trace.record("MESSAGE_SENT", { sentMessageId });

    // 10. PERSISTÊNCIA DA RESPOSTA (Atomicamente via RPC)
    // Uma falha aqui NUNCA pode interromper o fluxo ou lançar erro.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      // Assinatura REAL confirmada no banco: append_wa_message(p_phone text, p_new_message jsonb)
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
    // Falha no envio pela Evolution (rede/API)
    if (params.messageId) {
      const { markResponseFailed } = await import("./idempotency.server");
      await markResponseFailed(params.instance, params.messageId, "evolution_send_failed");
    }
    
    throw new Error(`EVOLUTION_REPLY_SEND_FAILED: Failed to send message via instance ${params.instance}`);
  }
}
