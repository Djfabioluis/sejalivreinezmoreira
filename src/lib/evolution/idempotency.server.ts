import { createHash } from "crypto";
import { logEvent } from "./logger.server";

export async function checkIdempotency(instance: string, messageId: string | undefined, phone: string, timestamp: number, text: string): Promise<{ isDuplicate: boolean; finalMessageId: string }> {
  let finalId = messageId;

  if (!finalId || finalId === "unknown" || finalId === "undefined" || finalId === "") {
    const hash = createHash("md5").update(text).digest("hex").slice(0, 8);
    finalId = `temp-${instance}-${phone}-${timestamp}-${hash}`;
    await logEvent({ 
      instance, 
      messageId: finalId, 
      event: "validation", 
      status: "missing_message_id", 
      errorDetail: "Generated temporary ID" 
    });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  // O requisito pede INSERT atômico sem SELECT prévio
  const { error } = await supabaseAdmin.from("evo_events" as never).insert({ 
    message_id: finalId, 
    instance,
    status: 'processing',
    trace_id: `${instance}:${finalId}`
  } as never);

  if (error) {
    if (error.code === "23505") { // Unique violation
      await logEvent({ 
        instance, 
        messageId: finalId, 
        event: "idempotency", 
        status: "duplicate_message" 
      });
      return { isDuplicate: true, finalMessageId: finalId };
    }
    
    // Fail-closed em outros erros
    await logEvent({ 
      instance, 
      messageId: finalId, 
      event: "idempotency", 
      status: "error", 
      errorDetail: error.message 
    });
    // Se falhou o insert por outro motivo (ex: timeout), não podemos processar (fail-closed)
    return { isDuplicate: true, finalMessageId: finalId }; 
  }

  return { isDuplicate: false, finalMessageId: finalId };
}

/**
 * Registra o início do envio da resposta para evitar envios duplicados.
 * Usa assistant_response_id como chave única (idempotência de envio).
 */
export async function markResponseAsSending(instance: string, sourceMessageId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const assistantResponseId = `${instance}:${sourceMessageId}:assistant`;

  const { error } = await supabaseAdmin
    .from("evo_events" as never)
    .update({ 
      assistant_response_id: assistantResponseId,
      status: 'response_ready'
    } as never)
    .match({ instance, message_id: sourceMessageId } as never)
    // Garantir que não foi enviado ou está sendo enviado
    .is("assistant_response_id" as never, null);

  if (error) return false;
  
  // Se não atualizou nenhuma linha, significa que já tinha assistant_response_id
  const { data } = await supabaseAdmin
    .from("evo_events" as never)
    .select("assistant_response_id")
    .match({ instance, message_id: sourceMessageId } as never)
    .single();

  return (data as any)?.assistant_response_id === assistantResponseId;
}

export async function markAsSent(instance: string, messageId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("evo_events" as never)
    .update({ 
      status: 'sent',
      processed_at: new Date().toISOString()
    } as never)
    .match({ instance, message_id: messageId } as never);
}
