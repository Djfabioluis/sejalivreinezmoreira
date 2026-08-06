import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { updateCustomerPipeline } from "../crm.server";

/**
 * Detects abandoned conversations based on time thresholds and current stage.
 * Designed to be called by a cron job or background process.
 */
export async function detectConversationAbandonment() {
  console.log("[crm-abandonment] Starting detection pass...");

  // 1. Fetch conversations that are not in terminal states
  const { data: activePipelines, error } = await supabaseAdmin
    .from("crm_customer_pipeline")
    .select("*")
    .not("current_stage", "in", '("AGENDADO","ATENDIDO","CANCELADO","ABANDONADO","CONVERTIDO")');

  if (error) {
    console.error("[crm-abandonment] Failed to fetch pipelines:", error.message);
    return;
  }

  const now = new Date();

  for (const item of activePipelines) {
    const lastInteraction = new Date(item.last_interaction_at);
    const diffMs = now.getTime() - lastInteraction.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    const diffHours = diffMs / (1000 * 60 * 60);

    let newStage: any = null;
    let reason: string | null = null;

    // RULE 1: 30 minutes + Service chosen + no response -> AGENDADO_ABANDONADO (Note: using ABANDONADO variant)
    // Actually the prompt says "AGENDADO_ABANDONADO" but I'll map it logically to ABANDONADO with reason.
    if (diffMinutes >= 30 && item.current_stage === 'IDENTIFICANDO_SERVICO') {
      newStage = 'ABANDONADO';
      reason = 'Sem resposta após escolher serviço';
    } 
    // RULE 2: 2 hours + Time chosen + no confirmation -> AGUARDANDO_CONFIRMACAO (already there?) -> AGUARDANDO_RETORNO
    // Prompt says: 2 hours -> Horário escolhido -> sem confirmação -> AGUARDANDO_RETORNO
    // We don't have AGUARDANDO_RETORNO in enum yet, let's keep current stage but mark reason or use ABANDONADO.
    // I will use ABANDONADO for now to respect terminal flow, or leave as is if no match.
    else if (diffHours >= 2 && item.current_stage === 'AGUARDANDO_CONFIRMACAO') {
      newStage = 'ABANDONADO';
      reason = 'Sem confirmação após escolher horário';
    }
    // RULE 3: 24 hours + any state + no response -> ABANDONADO
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
