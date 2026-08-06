import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type PipelineStage } from "../crm.server";

export async function scheduleFollowup(params: {
  phone: string;
  stage: PipelineStage;
  reason: string;
  scheduledAt: Date;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabaseAdmin.rpc("schedule_customer_followup", {
    p_phone: params.phone,
    p_stage: params.stage,
    p_reason: params.reason,
    p_scheduled_at: params.scheduledAt.toISOString(),
    p_metadata: params.metadata || {},
  });

  if (error) {
    console.error("[crm-followup] Failed to schedule followup:", error.message);
    return null;
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

