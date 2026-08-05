import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PipelineStage =
  | 'NOVO_CONTATO'
  | 'IDENTIFICANDO_SERVICO'
  | 'ESCOLHENDO_UNIDADE'
  | 'ESCOLHENDO_PROFISSIONAL'
  | 'ESCOLHENDO_DATA'
  | 'ESCOLHENDO_HORARIO'
  | 'AGUARDANDO_CONFIRMACAO'
  | 'AGENDADO'
  | 'ATENDIDO'
  | 'CANCELADO'
  | 'ABANDONADO'
  | 'CONVERTIDO';

export async function updateCustomerPipeline(params: {
  phone: string;
  conversationId?: string;
  stage: PipelineStage;
  customerName?: string;
  nextAction?: string;
  nextActionAt?: string;
}) {
  const { error } = await supabaseAdmin.rpc("update_customer_pipeline", {
    p_phone: params.phone,
    p_conversation_id: params.conversationId || null,
    p_stage: params.stage,
    p_customer_name: params.customerName || null,
    p_next_action: params.nextAction || null,
    p_next_action_at: params.nextActionAt || null,
  });

  if (error) {
    console.error("[crm] updateCustomerPipeline failed:", error.message);
  }
}
