import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logger } from "./observability/logger.server";
import { AppError } from "./core/errors";

export type PipelineStage =
  | 'NEW_LEAD'
  | 'IDENTIFYING_SERVICE'
  | 'CHOOSING_UNIT'
  | 'CHOOSING_PROFESSIONAL'
  | 'CHOOSING_DATE'
  | 'CHOOSING_TIME'
  | 'AWAITING_CONFIRMATION'
  | 'SCHEDULED'
  | 'ATTENDED'
  | 'CANCELED'
  | 'ABANDONED'
  | 'CONVERTED';

export async function updateCustomerPipeline(params: {
  phone: string;
  conversationId?: string;
  stage: PipelineStage;
  customerName?: string;
  nextAction?: string;
  nextActionAt?: string;
  abandonmentReason?: string;
}) {
  logger.info("CRM_PIPELINE_UPDATE_START", `Updating pipeline for ${params.phone} to ${params.stage}`, { stage: params.stage });

  // Get current stage for comparison before update
  const { data: current, error: getError } = await supabaseAdmin
    .from("crm_customer_pipeline")
    .select("current_stage")
    .eq("phone", params.phone)
    .maybeSingle();

  if (getError) {
    logger.error("CRM_PIPELINE_LOAD_FAILED", getError.message, { phone: params.phone, error: getError });
    throw new AppError({
      code: "PIPELINE_LOAD_FAILED",
      message: "Não foi possível carregar o estágio atual do cliente.",
      cause: getError
    });
  }

  const { error: rpcError } = await supabaseAdmin.rpc("update_customer_pipeline" as any, {
    p_phone: params.phone,
    p_conversation_id: params.conversationId || null,
    p_stage: params.stage,
    p_customer_name: params.customerName || null,
    p_next_action: params.nextAction || null,
    p_next_action_at: params.nextActionAt || null,
    p_abandonment_reason: params.abandonmentReason || null,
  });

  if (rpcError) {
    logger.error("CRM_PIPELINE_RPC_FAILED", rpcError.message, { phone: params.phone, stage: params.stage, error: rpcError });
    throw new AppError({
      code: "PIPELINE_UPDATE_FAILED",
      message: "Não foi possível atualizar o estágio do pipeline.",
      cause: rpcError
    });
  }

  // Handle followup scheduling on stage change
  const oldStage = current?.current_stage || 'NEW_LEAD';
  if (oldStage !== params.stage) {
    try {
      const { handleCrmStageChange } = await import("./crm/followup.server");
      await handleCrmStageChange(params.phone, oldStage as PipelineStage, params.stage);
      logger.info("CRM_PIPELINE_STAGE_CHANGED", `Stage changed from ${oldStage} to ${params.stage}`);
    } catch (e: any) {
      logger.error("CRM_FOLLOWUP_TRIGGER_FAILED", e.message, { phone: params.phone, error: e });
      // We don't throw here to avoid blocking the pipeline update, but we log the error
    }
  }

  return { success: true };
}

/**
 * Infer pipeline stage from tool call or context.
 * Internal helper to avoid IA determining stages when logic can do it.
 */
export function inferStageFromTool(toolName: string, result: any): PipelineStage | null {
  switch (toolName) {
    case 'list_services':
    case 'list_services_for_professional':
      return 'IDENTIFYING_SERVICE';
    case 'list_salons':
    case 'list_units_info':
      return 'CHOOSING_UNIT';
    case 'list_professionals':
      return 'CHOOSING_PROFESSIONAL';
    case 'list_slots':
      return 'CHOOSING_TIME';
    case 'validate_subscription_phone':
      return 'IDENTIFYING_SERVICE';
      return 'IDENTIFYING_SERVICE';
    case 'create_appointment':
      if (result?.id || result?.success) return 'SCHEDULED';
      return null;
    case 'cancel_appointment':
      return 'CANCELED';
    case 'transfer_conversation_unit':
      return 'CHOOSING_UNIT';
    default:
      return null;
  }
}

