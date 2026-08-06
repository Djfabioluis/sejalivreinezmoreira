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
  if (['AGENDADO', 'ATENDIDO', 'CANCELADO', 'CONVERTIDO'].includes(newStage)) {
    await supabaseAdmin
      .from("crm_followups")
      .update({ status: 'ENCERRADO', cancelled_at: new Date().toISOString() })
      .eq("phone", phone)
      .eq("status", "PENDENTE");
    return;
  }

  // Logic for followups:
  // - IDENTIFICANDO_SERVICO -> Followup in 30 min
  // - ESCOLHENDO_HORARIO -> Followup in 2h
  // - AGUARDANDO_CONFIRMACAO -> Followup in 2h
  
  let delayMs = 0;
  let reason = "";

  if (newStage === 'IDENTIFICANDO_SERVICO') {
    delayMs = 30 * 60 * 1000;
    reason = "Interesse em serviço mas sem prosseguir";
  } else if (['ESCOLHENDO_HORARIO', 'AGUARDANDO_CONFIRMACAO'].includes(newStage)) {
    delayMs = 2 * 60 * 60 * 1000;
    reason = "Faltou confirmar o horário";
  }

  if (delayMs > 0) {
    await scheduleFollowup({
      phone,
      stage: newStage,
      reason,
      scheduledAt: new Date(Date.now() + delayMs),
      metadata: { source: 'crm_stage_change' }
    });
  }
}
