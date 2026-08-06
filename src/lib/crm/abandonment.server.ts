import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { updateCustomerPipeline } from "../crm.server";

/**
 * Detects abandoned conversations based on time thresholds and current stage.
 * Designed to be called by a cron job or background process.
 */
export async function detectConversationAbandonment() {
  console.log("[crm-abandonment] Starting detection pass...");

  // Use as any for data to bypass type issues during initial setup
  const { data: activePipelines, error } = await supabaseAdmin
    .from("crm_customer_pipeline")
    .select("*")
    .not("current_stage", "in", '("AGENDADO","ATENDIDO","CANCELADO","ABANDONADO","CONVERTIDO")');

  if (error) {
    console.error("[crm-abandonment] Failed to fetch pipelines:", error.message);
    return;
  }

  const now = new Date();

  for (const item of (activePipelines as any[] || [])) {
    const lastInteraction = new Date(item.last_interaction_at);
    const diffMs = now.getTime() - lastInteraction.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const diffHours = diffMs / (1000 * 60 * 60);

    let newStage: any = null;
    let reason: string | null = null;

    // RULE 1: 30 minutes + Service chosen + no response -> ABANDONADO (Reason: Sem resposta)
    if (diffMinutes >= 30 && item.current_stage === 'IDENTIFICANDO_SERVICO') {
      newStage = 'ABANDONADO';
      reason = 'Sem resposta após escolher serviço';
    } 
    // RULE 2: 2 hours + Time chosen + no confirmation -> ABANDONADO
    else if (diffHours >= 2 && item.current_stage === 'AGUARDANDO_CONFIRMACAO') {
      newStage = 'ABANDONADO';
      reason = 'Sem confirmação após escolher horário';
    }
    // RULE 3: 24 hours + any state + no response -> ABANDONADO
    else if (diffHours >= 24) {
      newStage = 'ABANDONADO';
      reason = 'Nenhuma resposta em 24h';
    }

    // NEW RECOVERY HINTS: If we detected specific blockers in the context
    const ctx = item.customer_context || {};
    if (newStage === 'ABANDONADO') {
       if (ctx.abandon_trigger === 'PROFESSIONAL_UNAVAILABLE') reason = 'PROFESSIONAL_UNAVAILABLE';
       else if (ctx.abandon_trigger === 'SATURDAY_FULL') reason = 'SATURDAY_FULL';
       else if (ctx.abandon_trigger === 'PRICE') reason = 'PRICE';
    }

    if (newStage) {
      await updateCustomerPipeline({
        phone: item.phone,
        stage: newStage,
        abandonmentReason: reason || 'Cliente saiu'
      });
      console.log(`[crm-abandonment] Updated ${item.phone} to ${newStage} - ${reason}`);
    }
  }
}
