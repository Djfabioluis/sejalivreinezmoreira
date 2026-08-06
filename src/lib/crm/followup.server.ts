import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type PipelineStage } from "../crm.server";
import { logger } from "../observability/logger.server";
import { AppError } from "../core/errors";

export async function scheduleFollowup(params: {
  phone: string;
  stage: PipelineStage;
  reason: string;
  scheduledAt: Date;
  metadata?: Record<string, any>;
}) {
  logger.info("CRM_FOLLOWUP_SCHEDULE_START", `Scheduling followup for ${params.phone} at ${params.scheduledAt.toISOString()}`, { stage: params.stage });

  const { data, error } = await supabaseAdmin.rpc("schedule_customer_followup", {
    p_phone: params.phone,
    p_stage: params.stage,
    p_reason: params.reason,
    p_scheduled_at: params.scheduledAt.toISOString(),
    p_metadata: params.metadata || {},
  });

  if (error) {
    logger.error("CRM_FOLLOWUP_SCHEDULE_FAILED", error.message, { phone: params.phone, error });
    throw new AppError({
      code: "FOLLOWUP_SCHEDULE_FAILED",
      message: "Não foi possível agendar o follow-up do cliente.",
      cause: error
    });
  }

  return data;
}


/**
 * Logic to decide when to schedule a followup based on state changes.
 */
export async function handleCrmStageChange(phone: string, oldStage: PipelineStage, newStage: PipelineStage) {
  // If moving to terminal states, cancel pending followups
  if (['SCHEDULED', 'ATTENDED', 'CANCELED', 'CONVERTED', 'ABANDONED'].includes(newStage)) {
    await supabaseAdmin
      .from("crm_followups")
      .update({ status: 'CLOSED', cancelled_at: new Date().toISOString() })
      .eq("phone", phone)
      .eq("status", "PENDING");
    return;
  }

  // Logic for followups:
  // - IDENTIFYING_SERVICE -> Followup in 30 min
  // - CHOOSING_TIME -> Followup in 2h
  // - AWAITING_CONFIRMATION -> Followup in 2h
  
  let delayMs = 0;
  let reason = "";

  if (newStage === 'IDENTIFYING_SERVICE') {
    delayMs = 30 * 60 * 1000;
    reason = "Interesse em serviço mas sem prosseguir";
  } else if (['CHOOSING_TIME', 'AWAITING_CONFIRMATION'].includes(newStage)) {
    delayMs = 2 * 60 * 60 * 1000;
    reason = "Faltou confirmar o horário";
  }

  if (delayMs > 0) {
    await scheduleFollowup({
      phone: phone,
      stage: newStage,
      reason,
      scheduledAt: new Date(Date.now() + delayMs),
      metadata: { source: 'crm_stage_change' }
    });
  }
}

