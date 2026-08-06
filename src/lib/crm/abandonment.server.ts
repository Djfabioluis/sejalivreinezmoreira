import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { updateCustomerPipeline } from "../crm.server";

/**
 * Detects abandoned conversations based on time thresholds and current stage.
 * Designed to be called by a cron job or background process.
 */
export async function detectConversationAbandonment() {
  console.log("[crm-abandonment] Starting detection pass...");

  // Use as any to bypass local type strictness since table was just created/updated via migration
  const { data: activePipelines, error } = await supabaseAdmin
    .from("crm_customer_pipeline" as any)
    .select("*")
    .not("current_stage", "in", '("AGENDADO","ATENDIDO","CANCELADO","ABANDONADO","CONVERTIDO")');

  if (error) {
    console.error("[crm-abandonment] Failed to fetch pipelines:", error.message);
    return;
  }

  const now = new Date();

  for (const item of (activePipelines || [])) {
    const lastInteraction = new Date(item.last_interaction_at);
    const diffMs = now.getTime() - lastInteraction.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const diffHours = diffMs / (1000 * 60 * 60);

    let newStage: any = null;
    let reason: string | null = null;

    // RULE: 30 minutes + Service chosen + no response -> AGENDADO_ABANDONADO (mapped to ABANDONADO)
    if (diffMinutes >= 30 && item.current_stage === 'IDENTIFICANDO_SERVICO') {
      newStage = 'ABANDONADO';
      reason = 'Sem resposta após escolher serviço';
    } 
    // RULE: 2 hours + Time chosen + no confirmation -> AGUARDANDO_RETORNO (using ABANDONADO variant)
    else if (diffHours >= 2 && item.current_stage === 'AGUARDANDO_CONFIRMACAO') {
      newStage = 'ABANDONADO';
      reason = 'Sem confirmação após escolher horário';
    }
    // RULE: 24 hours + any state + no response -> ABANDONADO
    else if (diffHours >= 24) {
      newStage = 'ABANDONADO';
      reason = 'Nenhuma resposta em 24h';
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
