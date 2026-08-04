import { sendEvolutionText } from "@/lib/evolution.server";
import { logEvent } from "./logger.server";

export async function replyToUser(params: {
  instance: string;
  phone: string;
  text: string;
  conversationKey: string;
  messageId?: string;
}) {
  await logEvent({ 
    instance: params.instance, 
    messageId: params.messageId,
    event: "evolution_send_started", 
    status: "started" 
  });

  // 9. ENVIO PELA EVOLUTION
  const sent = await sendEvolutionText(params.instance, params.phone, params.text);

  if (sent) {
    await logEvent({ 
      instance: params.instance, 
      messageId: params.messageId,
      event: "evolution_send_completed", 
      status: "success" 
    });

    // 10. PERSISTÊNCIA DA RESPOSTA
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("append_wa_message" as any, {
      p_phone: params.conversationKey,
      p_message: { 
        id: `ai-${Date.now()}`, 
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
        errorDetail: error.message 
      });
      return false;
    }

    await logEvent({ 
      instance: params.instance, 
      messageId: params.messageId,
      event: "assistant_message_saved", 
      status: "success" 
    });
    return true;
  } else {
    await logEvent({ 
      instance: params.instance, 
      messageId: params.messageId,
      event: "evolution_send_failed", 
      status: "failed" 
    });
    return false;
  }
}
