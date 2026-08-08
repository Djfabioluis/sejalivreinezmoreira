import { processPendingFollowups } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function runEndToEndTest() {
  console.log("🚀 INICIANDO TESTE PONTA A PONTA - PIPELINE DE ENVIO");
  
  const testPhone = "5541998430354"; // Use a number that exists or is valid for testing
  const now = new Date();
  const scheduledAt = new Date(now.getTime() - 60000).toISOString(); // 1 minute ago to be ready
  
  // 1. Criar Job de Teste
  console.log("Step 1: Criando Job PENDING/READY...");
  const { data: job, error: createError } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone: testPhone,
      status: "READY",
      scheduled_at: scheduledAt,
      message_template: "Olá! Este é um teste automático do pipeline de envio Julia AI. 💜",
      metadata: { 
        test_type: "e2e_pipeline_fix",
        contact_name: "Fabio Teste",
        instance: "agente-5541998430354"
      }
    } as any)
    .select()
    .single();

  if (createError || !job) {
    console.error("❌ Erro ao criar job:", createError);
    return;
  }
  
  console.log(`✅ FOLLOWUP_CREATED: ${job.id}`);

  // 2. Executar Worker
  console.log("Step 2: Executando Worker...");
  await processPendingFollowups();
  
  // 3. Verificar Resultado
  console.log("Step 3: Verificando persistência...");
  const { data: updatedJob, error: fetchError } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("id", job.id)
    .single();

  if (fetchError || !updatedJob) {
    console.error("❌ Erro ao buscar job atualizado:", fetchError);
    return;
  }

  console.log("\n--- RESULTADOS DO TESTE ---");
  console.log(`Status Final: ${updatedJob.status}`);
  console.log(`Message ID: ${updatedJob.metadata?.message_id || "NÃO ENCONTRADO"}`);
  console.log(`Conversation ID: ${updatedJob.metadata?.conversationId || "NÃO ENCONTRADO"}`);
  console.log(`Finalizado em: ${updatedJob.completed_at || "PENDENTE"}`);
  
  if (updatedJob.status === "SENT" && updatedJob.metadata?.message_id) {
    console.log("\n🏆 TESTE APROVADO: O pipeline de envio concluiu todas as etapas!");
  } else {
    console.log("\n❌ TESTE REPROVADO: O job não atingiu o estado SENT ou falta o Message ID.");
    console.log("Metadata:", JSON.stringify(updatedJob.metadata, null, 2));
  }
}

runEndToEndTest().catch(console.error);
