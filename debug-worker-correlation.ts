import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function testCorrelation() {
  console.log("🚀 Iniciando teste de correlação de Job...");
  
  const phone = "5511" + Math.floor(10000000 + Math.random() * 90000000).toString();
  
  // 1. Obter uma regra existente
  const { data: rules } = await supabaseAdmin.from("crm_followup_rules").select("id").limit(1);
  if (!rules || rules.length === 0) {
    console.error("❌ Nenhuma regra encontrada no banco.");
    return;
  }
  const ruleId = rules[0].id;
  console.log(`✅ Usando Rule ID: ${ruleId}`);

  // 2. Criar Job de Teste
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

  // 3. Executar Worker
  const traceId = `test-corr-${Date.now()}`;
  console.log(`Running processSingleFollowup with parentTraceId: ${traceId}`);
  
  try {
    await processSingleFollowup(job, traceId);
    console.log("✅ Worker concluído.");
  } catch (err) {
    console.error("❌ Erro no Worker:", err);
  }

  // 4. Verificar Persistência
  const { data: finalJob } = await supabaseAdmin.from("crm_followups").select("*").eq("id", jobId).single();
  console.log("\n📊 Resultado Final do Job:");
  console.log(`Status: ${finalJob?.status}`);
  console.log(`Message ID: ${finalJob?.message_id}`);
  console.log(`Trace ID no Metadata: ${finalJob?.metadata?.trace_id}`);
  console.log(`Job ID no Metadata: ${finalJob?.metadata?.job_id}`);
  console.log(`Phone Last4 no Metadata: ${finalJob?.metadata?.phone_last4}`);
  
  if ((finalJob?.status === "SENT" || finalJob?.status === "CANCELED" || finalJob?.status === "FAILED") && finalJob?.metadata?.job_id === jobId) {
    console.log("\n✨ TESTE DE CORRELAÇÃO PASSOU! ✨");
    console.log(`Trace ID: ${finalJob?.metadata?.trace_id}`);
    console.log(`Job ID: ${finalJob?.id}`);
  } else {
    console.log("\n⚠️ TESTE DE CORRELAÇÃO FALHOU.");
  }
}

testCorrelation();
