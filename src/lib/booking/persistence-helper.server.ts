import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * PONTO ÚNICO DE PERSISTÊNCIA DE HISTÓRICO
 * Corrigido para a assinatura real detectada: (p_phone, p_new_message)
 */
export async function persistWaMessage(phone: string, message: any) {
  try {
    // A assinatura do banco é (p_phone text, p_new_message jsonb)
    // O PostgREST às vezes falha ao resolver por nomes se o cache estiver sujo.
    const { error } = await supabaseAdmin.rpc("append_wa_message", {
      p_phone: phone,
      p_new_message: message
    });

    if (error) {
      console.error(`[RPC_ERROR] append_wa_message(phone: ${phone}):`, error);
      
      // Tentativa 2: Parâmetros posicionais se o erro for de assinatura
      if (error.message.includes("Could not find the function")) {
         const { error: error2 } = await (supabaseAdmin as any).rpc("append_wa_message", {
            p_new_message: message,
            p_phone: phone
         });
         if (!error2) return { success: true };
         return { success: false, error: error2.message };
      }
      
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error(`[RPC_FATAL] append_wa_message(phone: ${phone}):`, err);
    return { success: false, error: err.message };
  }
}
