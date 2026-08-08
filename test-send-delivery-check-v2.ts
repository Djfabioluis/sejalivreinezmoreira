import { supabaseAdmin } from "./src/integrations/supabase/client.server";
import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";

async function main() {
  const phone = "5541999102791";
  const instance = "agente-5541998430354";
  
  console.log(`--- DISPARANDO TESTE REAL V2 PARA ${phone} ---`);

  // Criar o job com stage preenchido para evitar constraint error
  const { data: job, error } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone,
      status: "READY",
      stage: "FOLLOWUP_1", // Campo obrigatório
      scheduled_at: new Date().toISOString(),
      attempts: 0,
      metadata: {
        instance,
        source: "FINAL_DELIVERY_CONFIRMATION_V2",
        contact_name: "Inês Moreira"
      }
    } as any)
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar job:", error);
    return;
  }

  console.log(`Job criado: ${job.id}. Processando...`);

  // Processar o job
  await processSingleFollowup(job, "trace-delivery-check-v2");

  // Verificar resultado
  const { data: updated } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("id", job.id)
    .single();

  console.log("Resultado final do job:", {
    status: updated.status,
    message_id: updated.message_id,
    sent_at: updated.sent_at,
    error: updated.metadata?.last_error
  });
}

main().catch(console.error);
