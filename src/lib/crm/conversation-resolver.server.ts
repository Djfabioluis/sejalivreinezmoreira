import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logger } from "../observability/logger.server";
import { normalizeBrazilianPhone } from "@/lib/phone";

export interface ConversationResolution {
  conversation: any | null;
  foundBy: "phone_lookup" | "direct_id" | "none";
  instance: string;
  normalizedPhone: string;
}

/**
 * Single source of truth to resolve a conversation for any CRM follow-up.
 * Ensures the fallback by phone is applied consistently across all engines.
 */
export async function resolveConversationForFollowup(
  phone: string,
  metadata: any = {},
  traceId?: string
): Promise<ConversationResolution> {
  const normalized = normalizeBrazilianPhone(phone);
  const fullPhone = normalized?.full || phone.replace(/\D/g, '');
  const instance = metadata?.instance || "agente-5541998430354";
  
  const conversationKey = `${instance}:${fullPhone}`;
  
  try {
    const { data: existingConv } = await supabaseAdmin
      .from("wa_conversas")
      .select("*")
      .eq("phone", conversationKey)
      .maybeSingle();

    if (existingConv) {
      return {
        conversation: existingConv,
        foundBy: "phone_lookup",
        instance,
        normalizedPhone: fullPhone
      };
    }

    return {
      conversation: null,
      foundBy: "none",
      instance,
      normalizedPhone: fullPhone
    };
  } catch (err: any) {
    logger.error("CONVERSATION_RESOLUTION_ERROR", err.message, { phone, traceId });
    return {
      conversation: null,
      foundBy: "none",
      instance,
      normalizedPhone: fullPhone
    };
  }
}
