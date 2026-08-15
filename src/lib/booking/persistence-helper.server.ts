import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * PONTO ÚNICO DE PERSISTÊNCIA DE HISTÓRICO
 * Adapta a chamada para a assinatura real da RPC no banco.
 * A auditoria comprovou que a assinatura esperada é (p_new_message, p_phone).
 */
export async function persistWaMessage(phone: string, message: any) {
  try {
    // RECUPERAÇÃO DE CACHE POSTGREST: Em TanStack Start, o supabaseAdmin pode estar usando 
    // um client com definições tipadas ou cache de esquema antigo.
    // Forçamos a chamada exata ignorando tipagem se necessário.
    const { error } = await (supabaseAdmin.rpc as any)("append_wa_message", {
      p_phone: phone,
      p_new_message: message
    });

    // Se falhar com erro de "Could not find the function", tentamos a assinatura com 2 parâmetros nomeados invertidos
    // ou passamos como argumentos posicionais se o cache do PostgREST estiver muito inconsistente.
    if (error && error.message.includes("Could not find the function")) {
       console.warn("[RPC] Retrying append_wa_message with alternate signature...");
       const retry = await (supabaseAdmin.rpc as any)("append_wa_message", {
         p_new_message: message,
         p_phone: phone
       });
       if (!retry.error) return { success: true };
    }

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
