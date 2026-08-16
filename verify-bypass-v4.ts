import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function runTest() {
  console.log("🔍 Iniciando verificação FINAL da lógica de bypass (V4)...");

  const traceId = "verify-v4";
  
  // 1. Testar bypass legítimo (MANUAL_TEST)
  const syntheticJobId = "00000000-0000-4000-c000-3c297bd793ea";
  const syntheticJob = {
    id: syntheticJobId,
    phone: "5511999999998",
    trigger: "Um trigger qualquer",
    reason: "MANUAL_TEST",
    stage: "TEST_EXECUTION",
    metadata: {}
  };

  // Forçar status compatível no DB - Usando PENDING que é aceito no IN
  await supabaseAdmin.from("crm_followups").upsert({
    ...syntheticJob,
    status: "PENDING",
    updated_at: new Date().toISOString()
  } as any);

  console.log("1️⃣ Processando job com MANUAL_TEST...");
  await processSingleFollowup(syntheticJob, traceId);

  const { data: updatedSynthetic } = await supabaseAdmin
    .from("crm_followups")
    .select("status, cancel_reason")
    .eq("id", syntheticJobId)
    .single();

  console.log("Status após processamento:", updatedSynthetic?.status);
  console.log("Motivo de cancelamento:", updatedSynthetic?.cancel_reason);

  if (updatedSynthetic?.status === "CANCELED" && updatedSynthetic?.cancel_reason === "TEST_SKIPPED") {
    console.log("✅ SUCESSO: Job sintético foi pulado corretamente.");
  } else {
    console.error("❌ ERRO: Job sintético NÃO foi pulado.");
    process.exit(1);
  }

  // 2. Testar job real que contém "Teste" no nome mas reason real
  const realJobId = "00000000-0000-4000-c000-4c297bd793ea";
  const realJob = {
    id: realJobId,
    phone: "5511999999997",
    trigger: "Teste Real de Follow-up",
    reason: "REAL_FOLLOWUP",
    stage: "PRODUCTION",
    metadata: { contact_name: "Cliente Real" }
  };

  await supabaseAdmin.from("crm_followups").upsert({
    ...realJob,
    status: "PENDING",
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

  console.log("\n✨ Verificação V4 concluída com sucesso!");
}

runTest().catch(err => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
