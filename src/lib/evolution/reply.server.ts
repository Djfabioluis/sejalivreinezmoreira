import { sendEvolutionText } from "@/lib/evolution.server";
import { logEvent } from "./logger.server";

export async function replyToUser(params: {
  instance: string;
  phone: string;
  text: string;
  conversationKey: string;
}) {
  await logEvent({ 
    instance: params.instance, 
    event: "evolution_send", 
    status: "sendEvolution_started" 
  });

  const sent = await sendEvolutionText(params.instance, params.phone, params.text);

  if (sent) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("append_wa_message", {
      p_phone: params.conversationKey,
      p_message: { 
        id: `ai-${Date.now()}`, 
        role: "assistant", 
        parts: [{ type: "text", text: params.text }] 
      },
      p_instance: params.instance,
      p_phone_number: params.phone,
      p_increment_unread: false
    });

    if (error) {
      await logEvent({ 
        instance: params.instance, 
        event: "evolution_send", 
        status: "persistence_error", 
        errorDetail: error.message 
      });
      return false;
    }

    await logEvent({ 
      instance: params.instance, 
      event: "evolution_send", 
      status: "sendEvolution_finished" 
    });
    return true;
  } else {
    await logEvent({ 
      instance: params.instance, 
      event: "evolution_send", 
      status: "sendEvolution_failed" 
    });
    return false;
  }
}
