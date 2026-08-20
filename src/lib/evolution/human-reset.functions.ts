import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const resetConversationToAI = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ phone: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    console.log(`[HUMAN_TAKEOVER_RESET] Manual reset requested for phone: ${data.phone}`);
    
    const { error } = await supabaseAdmin
      .from("wa_conversas")
      .update({
        attendance_mode: "AI",
        human_takeover_at: null,
        human_takeover_detected: false,
        human_transfer_message_sent: false,
        ai_paused_at: null,
        ai_pause_reason: null,
        human_takeover_requested_at: null,
      })
      .eq("phone", data.phone);

    if (error) {
      console.error(`[HUMAN_TAKEOVER_RESET] Error resetting conversation ${data.phone}:`, error);
      throw new Error(`Erro ao resetar conversa: ${error.message}`);
    }

    return { success: true };
  });
