import { supabaseAdmin } from "../integrations/supabase/client.server";
import { processPendingFollowups } from "../lib/crm/followup-processor.server";

async function runFollowupTest() {
  const testPhone = "5541998430" + Math.floor(Math.random() * 99); // Numero "unico" para pular idempotencia
  const unitId = "1377"; 
  const ruleId = "69ad75fe-ba2a-4985-9065-3efdd36cc017"; 
  
  console.log(`[TEST_FOLLOWUP_START] Unidade: ${unitId}, Telefone: ${testPhone}`);
  
  try {
    const { data: followup, error } = await supabaseAdmin.from("crm_followups").insert({
      phone: testPhone,
      status: "READY",
      scheduled_at: new Date().toISOString(),
      rule_id: ruleId,
      stage: "AUTO_TEST_404_UNIQUE",
      metadata: { unit_id: unitId, is_test: true }
    } as any).select("*").single();

    if (error || !followup) {
      console.error("[TEST_FOLLOWUP_FAILED] Could not create test followup", error);
      return;
    }

    console.log(`[TEST_FOLLOWUP_CREATED] ID: ${followup.id}`);
    await processPendingFollowups();

    const { data: result } = await supabaseAdmin.from("crm_followups")
      .select("status, message_id, metadata, cancel_reason")
      .eq("id", followup.id)
      .single();

    console.log(`[TEST_FOLLOWUP_RESULT] Status: ${result?.status}, MessageID: ${result?.message_id}`);
    
    if (result?.status === "SENT" && result.message_id) {
      console.log("[TEST_FOLLOWUP_SUCCESS] Finalizado em SENT com Message ID!");
    } else {
      console.error("[TEST_FOLLOWUP_FAILED] Erro no processamento", result);
    }
  } catch (err: any) {
    console.error("[TEST_FOLLOWUP_ERROR]", err.message);
  }
}

runFollowupTest();
