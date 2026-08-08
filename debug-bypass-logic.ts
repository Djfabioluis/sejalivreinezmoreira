
import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function testBypassLogic() {
  console.log("🚀 Verificando se o trigger com a palavra 'Teste' causa bypass indevido...");

  const testPhone = "41999102791"; 
  const instance = "agente-5541998430354";
  
  // Limpar jobs antigos deste número
  await supabaseAdmin.from("crm_followups").delete().eq("phone", testPhone);

  const { data: rule } = await supabaseAdmin
    .from("crm_followup_rules")
    .select("id")
    .limit(1)
    .single();
  
  if (!rule) {
    console.error("Nenhuma regra encontrada.");
    return;
  }

  // Criar um job que contenha "Teste" no trigger, mas reason/stage REAIS
  const realJobId = "00000000-0000-4000-b000-" + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
  
  const { data: job, error: insertError } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      id: realJobId,
      phone: testPhone,
      customer_id: null,
      status: "PENDING",
      stage: "FOLLOWUP_READY", // Stage real
      reason: "NO_RESPONSE",     // Reason real
      scheduled_at: new Date().toISOString(),
      attempts: 0,
      rule_id: rule.id,
      metadata: {
        instance: instance,
        contact_name: "Cliente Real Teste",
        trigger: "Teste de verificação real" // String que antes poderia causar bypass
      }
    } as any)
    .select()
    .single();

  if (insertError) {
    console.error("Erro ao criar job:", insertError);
    return;
  }

  const traceId = `bypass-test-${Date.now()}`;
  await processSingleFollowup(job, traceId);

  const { data: updatedJob } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("id", realJobId)
    .single();

  console.log("\n📊 RESULTADO DA AUDITORIA:");
  console.log(JSON.stringify({
    status: updatedJob.status,
    cancel_reason: updatedJob.cancel_reason,
    found_by: updatedJob.metadata?.found_by,
    stage_at_fail: updatedJob.metadata?.last_error?.stage
  }, null, 2));

  // O sucesso aqui é NÃO ser TEST_SKIPPED. 
  // Ele provavelmente vai falhar em AI_GENERATION devido ao erro de gateway 400 que vimos antes,
  // mas o importante é que ele PASSOU pelo filtro de bypass.
  if (updatedJob.status !== "CANCELED" || updatedJob.cancel_reason !== "TEST_SKIPPED") {
    console.log("✅ SUCESSO: O job NÃO foi pulado indevidamente!");
  } else {
    console.log("❌ FALHA: O job foi pulado pelo filtro de bypass (TEST_SKIPPED).");
  }

  // Agora testar se o bypass REAL ainda funciona
  console.log("\n🚀 Verificando se o bypass legítimo (reason=MANUAL_TEST) ainda funciona...");
  const syntheticJobId = "00000000-0000-4000-b000-" + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
  const { data: sJob } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      id: syntheticJobId,
      phone: testPhone,
      status: "PENDING",
      reason: "MANUAL_TEST", // Bypass legítimo
      scheduled_at: new Date().toISOString(),
      attempts: 0,
      rule_id: rule.id
    } as any)
    .select()
    .single();

  await processSingleFollowup(sJob, traceId);
  const { data: updatedSJob } = await supabaseAdmin.from("crm_followups").select("status, cancel_reason").eq("id", syntheticJobId).single();
  
  if (updatedSJob.status === "CANCELED" && updatedSJob.cancel_reason === "TEST_SKIPPED") {
    console.log("✅ SUCESSO: Bypass legítimo funcionando.");
  } else {
    console.log("❌ FALHA: Bypass legítimo não funcionou.");
  }
}

testBypassLogic().catch(console.error);
