import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * PONTO ÚNICO DE PERSISTÊNCIA DE HISTÓRICO
 * Corrigido para a assinatura real detectada: (p_phone, p_new_message)
 */
export async function persistWaMessage(phone: string, message: any) {
  try {
    // A assinatura no Postgres é append_wa_message(p_phone text, p_new_message jsonb)
    const { error } = await supabaseAdmin.rpc("append_wa_message", {
      p_phone: phone,
      p_new_message: message
    });

    if (error) {
      console.error(`[RPC_ERROR] append_wa_message(phone: ${phone}):`, error);
      
      // Fallback para nomes de argumentos alternativos se o cache estiver sujo
      if (error.message.includes("Could not find the function")) {
         const { error: error2 } = await (supabaseAdmin.rpc as any)("append_wa_message", {
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
