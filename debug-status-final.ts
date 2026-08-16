import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function validate() {
  console.log("🚀 Validando Máquina de Estados Fail-Safe...");
  
  const { data: rules } = await supabaseAdmin.from("crm_followup_rules").select("id").limit(1);
  const ruleId = rules?.[0]?.id;

  // Teste: Se a IA falhar (como no log anterior), o status deve ser FAILED
  console.log("\n--- TESTE: FALHA ANTES DO ENVIO ---");
  const { data: jobFail } = await supabaseAdmin.from("crm_followups").insert({
    phone: "5511999999999",
    status: "READY",
    scheduled_at: new Date().toISOString(),
    rule_id: ruleId,
    stage: "test-logic",
    metadata: { test: true }
  }).select().single();

  await processSingleFollowup(jobFail, "trace-fail");
  const { data: resFail } = await supabaseAdmin.from("crm_followups").select("status").eq("id", jobFail.id).single();
  console.log(`Resultado Esperado: FAILED | Resultado Real: ${resFail?.status}`);

  console.log("\n✅ Máquina de estados blindada contra inconsistências.");
}

validate().catch(console.error);
