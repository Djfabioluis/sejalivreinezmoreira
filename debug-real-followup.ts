
import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function testRealFollowup() {
  console.log("🚀 Iniciando teste REAL de follow-up (caminho feliz)...");

  const testPhone = "41999102791"; 
  const instance = "agente-5541998430354";
  const conversationKey = `${instance}:${testPhone}`;

  // 1. Garantir que a conversa exista em wa_conversas
  const { data: existingConv } = await supabaseAdmin
    .from("wa_conversas")
    .select("id")
    .eq("phone", conversationKey)
    .maybeSingle();

  if (!existingConv) {
    await supabaseAdmin.from("wa_conversas").insert({
      phone: conversationKey,
      phone_number: testPhone,
      instance: instance,
      contact_name: "Cliente Real Teste",
      status: "aberta",
      messages: [],
      customer_context: {}
    } as any);
  }

  // 2. Limpar jobs anteriores
  await supabaseAdmin.from("crm_followups").delete().eq("phone", testPhone);

  // 3. Obter uma rule_id
  const { data: rule } = await supabaseAdmin
    .from("crm_followup_rules")
    .select("id")
    .limit(1)
    .single();
  
  if (!rule) {
    console.error("Nenhuma regra encontrada.");
    return;
  }

  // 4. Criar um job REAL
  const realJobId = "00000000-0000-4000-d000-" + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
  
  const { data: job, error: insertError } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      id: realJobId,
      phone: testPhone,
      customer_id: null,
      status: "PENDING",
      stage: "FOLLOWUP_READY",
      reason: "NO_RESPONSE",
      scheduled_at: new Date().toISOString(),
      attempts: 0,
      rule_id: rule.id,
      metadata: {
        instance: instance,
        contact_name: "Cliente Real Teste"
      }
    } as any)
    .select()
    .single();

  if (insertError) {
    console.error("Erro ao criar job:", insertError);
    return;
  }

  // 5. Executar o processador
  const traceId = `real-test-${Date.now()}`;
  await processSingleFollowup(job, traceId);

  // 6. Verificar resultado
  const { data: updatedJob } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("id", realJobId)
    .single();

  console.log("\n📊 RESULTADO DA AUDITORIA:");
  console.log(JSON.stringify({
    status: updatedJob.status,
    message_id: updatedJob.message_id,
    conversation_id: updatedJob.metadata?.conversationId,
    found_by: updatedJob.metadata?.found_by,
    last_error: updatedJob.metadata?.last_error?.message
  }, null, 2));

  if (updatedJob.status === "SENT") {
    console.log("✨ SUCESSO: O follow-up foi processado e ENVIADO!");
  } else {
    console.log("❌ FALHA: Status =", updatedJob.status);
    if (updatedJob.metadata?.last_error) {
       console.log("Detalhes do erro:", JSON.stringify(updatedJob.metadata.last_error, null, 2));
    }
  }
}

testRealFollowup().catch(console.error);
