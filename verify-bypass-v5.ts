import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function runTest() {
  console.log("🔍 Iniciando verificação FINAL da lógica de bypass (V5)...");

  const traceId = "verify-v5";
  
  // 1. Testar bypass legítimo (MANUAL_TEST)
  const syntheticJobId = "00000000-0000-4000-c000-5c297bd793ea";
  
  // Limpar qualquer estado anterior
  await supabaseAdmin.from("crm_followups").delete().eq("id", syntheticJobId);

  const syntheticJob = {
    id: syntheticJobId,
    phone: "5511999999998",
    trigger: "Um trigger qualquer",
    reason: "MANUAL_TEST",
    stage: "TEST_EXECUTION",
    metadata: {}
  };

  // Criar o job com status PENDING
  const { error: insertError } = await supabaseAdmin.from("crm_followups").insert({
    ...syntheticJob,
    status: "PENDING",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as any);

  if (insertError) {
    console.error("Erro ao inserir job sintético:", insertError);
    process.exit(1);
  }

  console.log("1️⃣ Processando job com MANUAL_TEST...");
  await processSingleFollowup(syntheticJob, traceId);

  const { data: updatedSynthetic, error: selectError } = await supabaseAdmin
    .from("crm_followups")
    .select("status, cancel_reason")
    .eq("id", syntheticJobId)
    .single();

  if (selectError) {
    console.error("Erro ao selecionar job sintético:", selectError);
    process.exit(1);
  }

  console.log("Status após processamento:", updatedSynthetic?.status);
  console.log("Motivo de cancelamento:", updatedSynthetic?.cancel_reason);

  if (updatedSynthetic?.status === "CANCELED" && updatedSynthetic?.cancel_reason === "TEST_SKIPPED") {
    console.log("✅ SUCESSO: Job sintético foi pulado corretamente.");
  } else {
    console.error("❌ ERRO: Job sintético NÃO foi pulado.");
    process.exit(1);
  }

  // 2. Testar job real que contém "Teste" no nome mas reason real
  const realJobId = "00000000-0000-4000-c000-6c297bd793ea";
  await supabaseAdmin.from("crm_followups").delete().eq("id", realJobId);

  const realJob = {
    id: realJobId,
    phone: "5511999999997",
    trigger: "Teste Real de Follow-up",
    reason: "REAL_FOLLOWUP",
    stage: "PRODUCTION",
    metadata: { contact_name: "Cliente Real" }
  };

  await supabaseAdmin.from("crm_followups").insert({
    ...realJob,
    status: "PENDING",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as any);

  console.log("\n2️⃣ Processando job com trigger 'Teste' mas reason REAL...");
  await processSingleFollowup(realJob, traceId);

  const { data: updatedReal } = await supabaseAdmin
    .from("crm_followups")
    .select("status, cancel_reason")
    .eq("id", realJobId)
    .single();

  if (updatedReal?.status === "CANCELED" && updatedReal?.cancel_reason === "TEST_SKIPPED") {
    console.error("❌ ERRO: O trigger textual causou bypass indevido!");
    process.exit(1);
  } else {
    console.log("✅ SUCESSO: O trigger textual NÃO causou bypass. Status:", updatedReal?.status);
  }

  console.log("\n✨ Verificação V5 concluída com sucesso!");
}

runTest().catch(err => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
