
import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function testFollowupResolution() {
  console.log("🚀 Iniciando teste de resolução de conversa por telefone...");

  // 1. Criar um job de teste com customer_id = null
  const testJobId = `test-${Math.random().toString(36).substring(7)}`;
  const testPhone = "41999102791";

  // Limpar jobs anteriores com este telefone para evitar idempotência
  await supabaseAdmin.from("crm_followups").delete().eq("phone", testPhone);

  const { data: job, error: insertError } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      id: testJobId,
      phone: testPhone,
      customer_id: null,
      status: "PENDING",
      scheduled_at: new Date().toISOString(),
      attempts: 0,
      rule_id: "00000000-0000-0000-0000-000000000000",
      reason: "UNIT_TEST_PHONE_RESOLUTION",
      metadata: {
        instance: "agente-5541998430354",
        contact_name: "Teste Telefone"
      }
    } as any)
    .select()
    .single();

  if (insertError) {
    console.error("❌ Falha ao criar job de teste:", insertError);
    return;
  }

  console.log("✅ Job de teste criado:", job.id);

  // 2. Executar o processador para este job específico
  console.log("⚙️ Executando processSingleFollowup...");
  await processSingleFollowup(job, "trace-test-resolution");

  // 3. Verificar o resultado no banco
  const { data: updatedJob } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("id", testJobId)
    .single();

  console.log("📊 Estado final do Job:");
  console.log(JSON.stringify({
    status: updatedJob.status,
    cancel_reason: updatedJob.cancel_reason,
    message_id: updatedJob.message_id,
    conversation_id: updatedJob.metadata?.conversationId
  }, null, 2));

  if (updatedJob.status === "SENT" && updatedJob.metadata?.conversationId) {
    console.log("✨ SUCESSO: Conversa resolvida pelo telefone e mensagem enviada!");
  } else if (updatedJob.status === "CANCELED" && updatedJob.cancel_reason === "TEST_SKIPPED") {
    console.log("ℹ️ INFO: Job de teste foi corretamente ignorado pelo bypass de teste.");
  } else {
    console.log("❌ FALHA: O job não atingiu o estado esperado.");
  }
}

testFollowupResolution().catch(console.error);
