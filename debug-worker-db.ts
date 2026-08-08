
import { processPendingFollowups } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function runTest() {
  console.log("🚀 Iniciando teste real do Worker de Follow-up...");

  // 1. Criar um job de teste
  const testPhone = "5511999999999";
  const { data: job, error: createError } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone: testPhone,
      status: "READY",
      stage: "DEBUG",
      scheduled_at: new Date().toISOString(),
      metadata: { 
        test_run: true,
        contact_name: "Teste Fabio"
      }
    } as any)
    .select()
    .single();

  if (createError) {
    console.error("❌ Erro ao criar job de teste:", createError);
    process.exit(1);
  }

  const jobId = (job as any).id;
  console.log(`✅ Job de teste criado: ${jobId}`);

  // 2. Executar o worker
  console.log("⏳ Executando processPendingFollowups()...");
  await processPendingFollowups();

  // 3. Verificar resultado no banco
  console.log("🔍 Consultando estado final no banco...");
  const { data: finalJob, error: fetchError } = await supabaseAdmin
    .from("crm_followups")
    .select("status, conversation_id, message_id, sent_at, completed_at, metadata")
    .eq("id", jobId)
    .single();

  if (fetchError) {
    console.error("❌ Erro ao buscar resultado final:", fetchError);
  } else {
    console.log("📊 RESULTADO DO BANCO:");
    console.log(JSON.stringify(finalJob, null, 2));

    const j = finalJob as any;
    const success = j.status === 'SENT' && j.sent_at && j.completed_at && j.metadata?.message_id;
    
    if (success) {
      console.log("✅ TESTE BEM-SUCEDIDO: Todos os campos foram atualizados!");
    } else {
      console.error("❌ TESTE FALHOU: O registro não foi totalmente atualizado.");
    }
  }

  process.exit(0);
}

runTest().catch(err => {
  console.error("💥 Erro fatal no teste:", err);
  process.exit(1);
});
