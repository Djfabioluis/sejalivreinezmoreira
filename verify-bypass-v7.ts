import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function runTest() {
  console.log("🔍 Iniciando verificação FINAL da lógica de bypass (V7)...");

  const traceId = "verify-v7";
  
  // 1. Testar bypass legítimo (MANUAL_TEST)
  const syntheticJobId = "00000000-0000-4000-c000-7c297bd793ea";
  
  await supabaseAdmin.from("crm_followups").delete().eq("id", syntheticJobId);

  const syntheticJob = {
    id: syntheticJobId,
    phone: "5511999999998",
    reason: "MANUAL_TEST",
    stage: "TEST_EXECUTION",
    metadata: { trigger: "Um trigger qualquer" }
  };

  // Usar status compatível com a lista .in(...)
  await supabaseAdmin.from("crm_followups").insert({
    ...syntheticJob,
    status: "READY", 
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  } as any);

  console.log("1️⃣ Processando job com MANUAL_TEST...");
  await processSingleFollowup(syntheticJob, traceId);

  const { data: updatedSynthetic } = await supabaseAdmin
    .from("crm_followups")
    .select("status, cancel_reason")
    .eq("id", syntheticJobId)
    .single();

  console.log("Status:", updatedSynthetic?.status, "Reason:", updatedSynthetic?.cancel_reason);

  if (updatedSynthetic?.status === "CANCELED" && updatedSynthetic?.cancel_reason === "TEST_SKIPPED") {
    console.log("✅ SUCESSO: Job sintético foi pulado corretamente.");
  } else {
    console.error("❌ ERRO: Job sintético NÃO foi pulado.");
    process.exit(1);
  }

  // 2. Testar job real que contém "Teste" no NOME (metadata.trigger) mas reason real
  const realJobId = "00000000-0000-4000-c000-8c297bd793ea";
  await supabaseAdmin.from("crm_followups").delete().eq("id", realJobId);

  const realJob = {
    id: realJobId,
    phone: "5511999999997",
    reason: "REAL_FOLLOWUP",
    stage: "PRODUCTION",
    metadata: { trigger: "Teste Real de Follow-up", contact_name: "Cliente Real" }
  };

  await supabaseAdmin.from("crm_followups").insert({
    ...realJob,
    status: "READY",
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

  console.log("\n✨ Verificação V7 concluída com sucesso!");
}

runTest().catch(err => {
  console.error("Erro no teste:", err);
  process.exit(1);
});
