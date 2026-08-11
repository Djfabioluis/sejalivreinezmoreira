import { supabaseAdmin } from "../integrations/supabase/client.server";
import { processPendingFollowups } from "../lib/crm/followup-processor.server";

async function runFollowupTest() {
  const testPhone = "5541998430354"; 
  const unitId = "1377"; 
  const ruleId = "9ad5d5fd-d602-4731-8933-281b37497d39"; // Usar uma rule_id válida se possível, ou criar uma fake
  
  console.log(`[TEST_FOLLOWUP_START] Unidade: ${unitId}, Telefone: ${testPhone}`);
  
  try {
    // 1. Criar job de 2 minutos no futuro (mas vamos rodar agora)
    const scheduledAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    
    // Deletar anteriores para não sujar o teste
    await supabaseAdmin.from("crm_followups").delete().eq("phone", testPhone).eq("stage", "AUTO_TEST_404");

    const { data: followup, error } = await supabaseAdmin.from("crm_followups").insert({
      phone: testPhone,
      status: "READY",
      scheduled_at: new Date().toISOString(), // Rodar agora
      rule_id: ruleId,
      stage: "AUTO_TEST_404",
      metadata: { unit_id: unitId, is_test: true }
    } as any).select("*").single();

    if (error || !followup) {
      console.error("[TEST_FOLLOWUP_FAILED] Could not create test followup", error);
      return;
    }

    console.log(`[TEST_FOLLOWUP_CREATED] ID: ${followup.id}`);

    // 2. Rodar o processador
    await processPendingFollowups();

    // 3. Verificar resultado
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
