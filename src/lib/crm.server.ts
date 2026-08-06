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
  abandonmentReason?: string;
}) {
  const { error } = await supabaseAdmin.rpc("update_customer_pipeline" as any, {
    p_phone: params.phone,
    p_conversation_id: params.conversationId || null,
    p_stage: params.stage,
    p_customer_name: params.customerName || null,
    p_next_action: params.nextAction || null,
    p_next_action_at: params.nextActionAt || null,
    p_abandonment_reason: params.abandonmentReason || null,
  });

  if (error) {
    console.error("[crm] updateCustomerPipeline failed:", error.message);
  }
}

/**
 * Infer pipeline stage from tool call or context.
 * Internal helper to avoid IA determining stages when logic can do it.
 */
export function inferStageFromTool(toolName: string, result: any): PipelineStage | null {
  switch (toolName) {
    case 'list_services':
    case 'list_services_for_professional':
      return 'IDENTIFICANDO_SERVICO';
    case 'list_salons':
    case 'list_units_info':
      return 'ESCOLHENDO_UNIDADE';
    case 'list_professionals':
      return 'ESCOLHENDO_PROFISSIONAL';
    case 'list_slots':
      return 'ESCOLHENDO_HORARIO'; // Usually called after date is narrowed
    case 'validate_subscription_cpf':
      return 'IDENTIFICANDO_SERVICO';
    case 'create_appointment':
      if (result?.id || result?.success) return 'AGENDADO';
      return null;
    case 'cancel_appointment':
      return 'CANCELADO';
    case 'transfer_conversation_unit':
      return 'ESCOLHENDO_UNIDADE';
    default:
      return null;
  }
}
