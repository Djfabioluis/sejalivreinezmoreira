import { logEvent } from "./logger.server";
import { extractConversationMessageText } from "@/lib/whatsapp-inbox.functions";

export async function appendIncomingMessage(params: {
  conversationKey: string;
  messageId: string;
  text: string;
  instance: string;
  phone: string;
  contactName?: string;
  isIAActive: boolean;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  const { data, error } = await supabaseAdmin.rpc("append_wa_message", {
    p_phone: params.conversationKey,
    p_message: { id: params.messageId, role: "user", parts: [{ type: "text", text: params.text }] },
    p_instance: params.instance,
    p_phone_number: params.phone,
    p_contact_name: params.contactName ?? undefined,
    p_increment_unread: true,
    p_new_status: params.isIAActive ? "aberta" : "waiting_for_unit_selection"
  });

  if (error) {
    await logEvent({ 
      instance: params.instance, 
      messageId: params.messageId, 
      event: "persistence", 
      status: "conversation_rpc_failed", 
      errorDetail: error.message 
    });
    throw new Error(`Failed to append message: ${error.message}`);
  }

  await logEvent({ 
    instance: params.instance, 
    messageId: params.messageId, 
    event: "persistence", 
    status: "message_saved" 
  });
  
  return data;
}

export async function updateConversationMetadata(conversationKey: string, metadata: {
  agent_id?: string;
  unidade_id?: string;
  contact_name?: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  const updateData: any = {};
  if (metadata.agent_id) updateData.agent_id = metadata.agent_id;
  if (metadata.unidade_id) updateData.unidade_id = metadata.unidade_id;
  if (metadata.contact_name) updateData.contact_name = metadata.contact_name;

  if (Object.keys(updateData).length === 0) return;

  const { error } = await supabaseAdmin
    .from("wa_conversas" as never)
    .update(updateData as never)
    .eq("phone", conversationKey);

  if (error) {
    await logEvent({ 
      instance: "unknown", 
      event: "persistence", 
      status: "conversation_update_failed", 
      errorDetail: error.message 
    });
    // Não lançamos erro aqui para não interromper o fluxo se o save da mensagem deu certo
  }
}

export async function getConversationHistory(conversationKey: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  const { data, error } = await supabaseAdmin
    .from("wa_conversas" as never)
    .select("messages, customer_context, contact_name")
    .eq("phone", conversationKey)
    .maybeSingle();

  if (error) {
    await logEvent({ 
      instance: "unknown", 
      event: "history_loaded", 
      status: "error", 
      errorDetail: error.message 
    });
    return null;
  }

  return data as any;
}
