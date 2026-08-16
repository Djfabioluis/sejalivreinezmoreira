import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * PONTO ÚNICO DE PERSISTÊNCIA DE HISTÓRICO
 * Corrigido para a assinatura real comprovada: (p_phone text, p_new_message jsonb)
 */
export async function persistWaMessage(phone: string, message: any) {
  try {
    // A assinatura real no Postgres é append_wa_message(p_phone text, p_new_message jsonb)
    // Enviar apenas os 2 parâmetros esperados.
    const { error } = await supabaseAdmin.rpc("append_wa_message", {
      p_phone: phone,
      p_new_message: message
    });

    if (error) {
      console.error(`[RPC_ERROR] append_wa_message(phone: ${phone}):`, error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error(`[RPC_FATAL] append_wa_message(phone: ${phone}):`, err);
    return { success: false, error: err.message };
  }
}
