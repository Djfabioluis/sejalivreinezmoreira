import { logEvent } from "./logger.server";
import { extractConversationMessageText } from "@/lib/whatsapp-inbox.functions";
import { updateCustomerPipeline } from "@/lib/crm.server";

export async function appendIncomingMessage(params: {
  conversationKey: string;
  messageId: string;
  text: string;
  instance: string;
  phone: string;
  contactName?: string;
  isIAActive: boolean;
  metadata?: Record<string, unknown> | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const message: Record<string, unknown> = {
    id: params.messageId,
    role: "user",
    parts: [{ type: "text", text: params.text }],
    createdAt: new Date().toISOString(),
  };
  if (params.metadata) message.metadata = params.metadata;

  const { data, error } = await supabaseAdmin.rpc("append_wa_message" as any, {
    p_phone: params.conversationKey,
    p_message: message,
    p_instance: params.instance,
    p_phone_number: params.phone,
    p_contact_name: params.contactName ?? null,
    p_increment_unread: true,
    p_new_status: "aberta", 
    p_customer_context: null
  });

  // Se a RPC funcionou, recarregamos a linha para garantir que temos o objeto completo (messages, customer_context, etc)
  // O id da conversa é o que a RPC retorna ou o params.conversationKey se for o phone
  let refreshedData = data;
  if (!error && params.conversationKey) {
    const { data: conv } = await supabaseAdmin
      .from("wa_conversas" as any)
      .select("id, messages, customer_context, contact_name, attendance_mode, human_takeover_at, human_takeover_detected, human_takeover_requested_at, human_transfer_message_sent, ai_paused_at, ai_pause_reason, last_human_message_at, phone, instance, unidade_id")
      .eq("phone", params.conversationKey)
      .maybeSingle();
    if (conv) refreshedData = conv;
  }

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

  // Update CRM on new incoming message
  if (data?.id) {
    await updateCustomerPipeline({
      phone: params.phone,
      conversationId: data.id,
      stage: 'NEW_LEAD', // Base stage on message, IA/Tools will refine it
      customerName: params.contactName
    });

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
