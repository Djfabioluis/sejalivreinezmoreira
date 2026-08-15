import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * PONTO ÚNICO DE PERSISTÊNCIA DE HISTÓRICO
 * Adapta a chamada para a assinatura real da RPC no banco.
 * A auditoria comprovou que a assinatura esperada é (p_new_message, p_phone).
 */
export async function persistWaMessage(phone: string, message: any) {
  try {
    const { error } = await supabaseAdmin.rpc("append_wa_message", {
      p_new_message: message,
      p_phone: phone
    });

    if (error) {
      console.error("[RPC] Error persisting message:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("[RPC] Fatal error persisting message:", err);
    return { success: false, error: err.message };
  }
}
