import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function runTest() {
  console.log("🔍 Iniciando verificação FINAL da lógica de bypass...");

  const testJobId = "00000000-0000-4000-c000-1c297bd793ea";
  const traceId = "verify-final-trace";

  // Mock de um job que TEM "Teste" no trigger, mas REASON/STAGE reais
  const realJob = {
    id: testJobId,
    phone: "5511999999999",
    trigger: "Teste de verificação real",
    reason: "SCHEDULED_FOLLOWUP", // Não é MANUAL_TEST
    stage: "PRODUCTION",          // Não é TEST_EXECUTION
    metadata: { contact_name: "Fabio Teste" }
  };

  // 1. Limpar estado anterior no DB mock (se necessário, aqui usamos o real mas com ID controlado)
  await supabaseAdmin.from("crm_followups").upsert({
    ...realJob,
    status: "READY",
    updated_at: new Date().toISOString()
  } as any);

  console.log("1️⃣ Testando trigger 'Teste' com campos REAIS (Não deve pular)...");
  await processSingleFollowup(realJob, traceId);

  // Verificar se o job prosseguiu (não deve ser CANCELED com TEST_SKIPPED)
  const { data: updatedReal } = await supabaseAdmin
    .from("crm_followups")
    .select("status, cancel_reason")
    .eq("id", testJobId)
    .single();

  if (updatedReal?.status === "CANCELED" && updatedReal?.cancel_reason === "TEST_SKIPPED") {
    console.error("❌ ERRO: O bypass textual ainda está ativo! O job foi cancelado indevidamente.");
    process.exit(1);
  } else {
    console.log("✅ SUCESSO: O trigger textual NÃO causou bypass. Status atual:", updatedReal?.status);
  }

  // 2. Testar bypass legítimo
  console.log("\n2️⃣ Testando reason 'MANUAL_TEST' (Deve pular)...");
  const syntheticJob = {
    ...realJob,
    id: "00000000-0000-4000-c000-2c297bd793ea",
    reason: "MANUAL_TEST"
  };

  await supabaseAdmin.from("crm_followups").upsert({
    ...syntheticJob,
    status: "READY",
    updated_at: new Date().toISOString()
  } as any);

  await processSingleFollowup(syntheticJob, traceId);

  const { data: updatedSynthetic } = await supabaseAdmin
    .from("crm_followups")
    .select("status, cancel_reason")
    .eq("id", syntheticJob.id)
    .single();

  if (updatedSynthetic?.status === "CANCELED" && updatedSynthetic?.cancel_reason === "TEST_SKIPPED") {
    console.log("✅ SUCESSO: Job sintético foi pulado corretamente.");
  } else {
    console.error("❌ ERRO: Job sintético NÃO foi pulado.");
    process.exit(1);
  }

  console.log("\n✨ Verificação concluída com sucesso!");
}

runTest().catch(err => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
