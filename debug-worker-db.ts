
import { processPendingFollowups } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function runTest() {
  console.log("🚀 Iniciando teste real do Worker de Follow-up...");

  // 1. Verificar se existe algum job READY ou PENDING para processar
  const { data: existingJobs } = await supabaseAdmin
    .from("crm_followups")
    .select("id")
    .in("status", ["READY", "PENDING"])
    .limit(1);

  if (!existingJobs || existingJobs.length === 0) {
     console.log("📝 Nenhum job pendente encontrado. Criando job de teste...");
     const { error: createError } = await supabaseAdmin
      .from("crm_followups")
      .insert({
        phone: "5511999999999",
        status: "READY",
        stage: "TEST",
        scheduled_at: new Date().toISOString(),
        metadata: { 
          test_run: true,
          contact_name: "Fabio"
        }
      } as any);
      
      if (createError) {
        console.error("❌ Erro ao criar job:", createError);
        process.exit(1);
      }
  }

  // 2. Executar o worker
  console.log("⏳ Executando processPendingFollowups()...");
  await processPendingFollowups();

  // 3. Consultar o banco para ver os últimos jobs processados
  console.log("🔍 Consultando registros atualizados no banco...");
  const { data: updatedJobs, error: fetchError } = await supabaseAdmin
    .from("crm_followups")
    .select("id, status, sent_at, completed_at, updated_at, metadata")
    .order("updated_at", { ascending: false })
    .limit(3);

  if (fetchError) {
    console.error("❌ Erro ao buscar registros:", fetchError);
  } else {
    console.log("📊 RESULTADOS RECENTES DO BANCO:");
    updatedJobs?.forEach(job => {
      const meta = (job.metadata as any) || {};
      console.log(`\n--- Job: ${job.id} ---`);
      console.log(`Status: ${job.status}`);
      console.log(`Conversation ID (metadata): ${meta.conversationId || 'NULL'}`);
      console.log(`Message ID (metadata): ${meta.message_id || 'NULL'}`);
      console.log(`Sent At: ${job.sent_at || 'NULL'}`);
      console.log(`Completed At: ${job.completed_at || 'NULL'}`);
      console.log(`Metadata snippet: ${JSON.stringify(meta, null, 2).slice(0, 150)}...`);
    });

    const hasSent = updatedJobs?.some(j => j.status === 'SENT');
    if (hasSent) {
      console.log("\n✅ SUCESSO: Pelo menos um job foi marcado como SENT e persistido!");
    } else {
      console.log("\n⚠️ AVISO: Nenhum job chegou ao status SENT. Verifique os logs de FOLLOWUP_DB_UPDATE_SUCCESS para outros status.");
    }
  }

  process.exit(0);
}

runTest().catch(err => {
  console.error("💥 Erro fatal no teste:", err);
  process.exit(1);
});


