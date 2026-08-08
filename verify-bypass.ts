
import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function verifyBypassFinal() {
  console.log("🔍 Iniciando verificação FINAL da lógica de bypass...");

  const testPhone = "41999102791"; 
  const instance = "agente-5541998430354";
  
  // Limpeza
  await supabaseAdmin.from("crm_followups").delete().eq("phone", testPhone);

  const { data: rule } = await supabaseAdmin
    .from("crm_followup_rules")
    .select("id")
    .limit(1)
    .single();
  
  if (!rule) {
    console.error("Nenhuma regra de followup encontrada no banco.");
    process.exit(1);
  }

  // TESTE 1: Trigger com "Teste" mas reason/stage REAIS (NÃO deve dar bypass)
  console.log("\n1️⃣ Testando trigger 'Teste de verificação real' com campos REAIS...");
  const realJobId = "00000000-0000-4000-c000-" + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
  
  const { data: jobReal } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      id: realJobId,
      phone: testPhone,
      status: "PENDING",
      stage: "FOLLOWUP_READY", 
      reason: "NO_RESPONSE",
      scheduled_at: new Date().toISOString(),
      attempts: 0,
      rule_id: rule.id,
      metadata: {
        trigger: "Teste de verificação real",
        instance
      }
    } as any)
    .select()
    .single();

  await processSingleFollowup(jobReal, "verify-real");
  const { data: resReal } = await supabaseAdmin.from("crm_followups").select("status, cancel_reason, metadata").eq("id", realJobId).single();
  
  if (resReal.status !== "CANCELED" || resReal.cancel_reason !== "TEST_SKIPPED") {
    console.log("✅ SUCESSO: O trigger textual NÃO causou bypass. O fluxo prosseguiu.");
  } else {
    console.log("❌ FALHA: O trigger textual causou bypass indevido (TEST_SKIPPED).");
  }

  // TESTE 2: Campos estruturados de teste (DEVE dar bypass)
  console.log("\n2️⃣ Testando reason 'MANUAL_TEST' (Bypass legítimo)...");
  const synthJobId = "00000000-0000-4000-c000-" + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
  const { data: jobSynth } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      id: synthJobId,
      phone: testPhone,
      status: "PENDING",
      reason: "MANUAL_TEST",
      scheduled_at: new Date().toISOString(),
      attempts: 0,
      rule_id: rule.id,
      metadata: { instance }
    } as any)
    .select()
    .single();

  await processSingleFollowup(jobSynth, "verify-synth");
  const { data: resSynth } = await supabaseAdmin.from("crm_followups").select("status, cancel_reason").eq("id", synthJobId).single();
  
  if (resSynth.status === "CANCELED" && resSynth.cancel_reason === "TEST_SKIPPED") {
    console.log("✅ SUCESSO: O bypass legítimo por reason='MANUAL_TEST' funcionou.");
  } else {
    console.log("❌ FALHA: O bypass por campos estruturados não funcionou. Status: " + resSynth.status);
  }
}

verifyBypassFinal().catch(err => {
  console.error(err);
  process.exit(1);
});
