import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function testCorrelation() {
  console.log("🚀 Iniciando teste de correlação de Job...");
  
  const phone = "5511999999999";
  const ruleId = "a53d6804-d50c-4384-954f-123456789012";
  
  // 1. Criar Job de Teste
  const { data: job, error } = await supabaseAdmin.from("crm_followups").insert({
    phone,
    rule_id: ruleId,
    status: "READY",
    stage: "TEST_AUDIT",
    reason: "TEST_AUDIT_REASON",
    scheduled_at: new Date().toISOString(),
    metadata: { is_test: true, test_name: "correlation_audit" }
  } as any).select("*").single();

  if (error || !job) {
    console.error("❌ Falha ao criar job de teste:", error);
    return;
  }

  const jobId = job.id;
  console.log(`✅ Job criado: ${jobId}`);

  // 2. Executar Worker
  const traceId = `test-corr-${Date.now()}`;
  console.log(`Running processSingleFollowup with parentTraceId: ${traceId}`);
  
  try {
    await processSingleFollowup(job, traceId);
    console.log("✅ Worker concluído.");
  } catch (err) {
    console.error("❌ Erro no Worker:", err);
  }

  // 3. Verificar Persistência
  const { data: finalJob } = await supabaseAdmin.from("crm_followups").select("*").eq("id", jobId).single();
  console.log("\n📊 Resultado Final do Job:");
  console.log(`Status: ${finalJob?.status}`);
  console.log(`Message ID: ${finalJob?.message_id}`);
  console.log(`Trace ID no Metadata: ${finalJob?.metadata?.trace_id}`);
  console.log(`Job ID no Metadata: ${finalJob?.metadata?.job_id}`);
  console.log(`Phone Last4 no Metadata: ${finalJob?.metadata?.phone_last4}`);
  
  if ((finalJob?.status === "SENT" || finalJob?.status === "CANCELED") && finalJob?.metadata?.job_id === jobId) {
    console.log("\n✨ TESTE DE CORRELAÇÃO PASSOU! ✨");
    console.log(`Trace ID: ${finalJob?.metadata?.trace_id}`);
    console.log(`Job ID: ${finalJob?.id}`);
  } else {
    console.log("\n⚠️ TESTE DE CORRELAÇÃO FALHOU.");
  }
}

testCorrelation();
