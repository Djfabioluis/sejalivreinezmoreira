
import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function testRealFollowup() {
  console.log("🚀 Iniciando teste REAL de follow-up...");

  const testPhone = "41999102791"; // Número do usuário
  const instance = "agente-5541998430354";
  const conversationKey = `${instance}:${testPhone}`;

  // 1. Garantir que a conversa exista em wa_conversas
  console.log("🔍 Verificando se a conversa existe em wa_conversas...");
  const { data: existingConv } = await supabaseAdmin
    .from("wa_conversas")
    .select("id")
    .eq("phone", conversationKey)
    .maybeSingle();

  if (!existingConv) {
    console.log("📝 Criando conversa fake em wa_conversas para o teste...");
    await supabaseAdmin.from("wa_conversas").insert({
      phone: conversationKey,
      phone_number: testPhone,
      instance: instance,
      contact_name: "Cliente Real Teste",
      status: "aberta",
      messages: [],
      customer_context: {}
    } as any);
  } else {
    console.log("✅ Conversa já existe:", existingConv.id);
  }

  // 2. Limpar jobs anteriores para este telefone
  await supabaseAdmin.from("crm_followups").delete().eq("phone", testPhone);

  // 3. Obter uma rule_id válida (precisamos disso por causa da FK)
  const { data: rule } = await supabaseAdmin
    .from("crm_followup_rules")
    .select("id")
    .limit(1)
    .single();
  
  if (!rule) {
    console.error("❌ Nenhuma regra de followup encontrada no banco. Crie uma regra primeiro.");
    return;
  }

  // 4. Criar um job REAL (não MANUAL_TEST)
  const realJobId = "00000000-0000-4000-c000-" + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
  
  console.log("📝 Criando job REAL em crm_followups...");
  const { data: job, error: insertError } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      id: realJobId,
      phone: testPhone,
      customer_id: null,
      status: "PENDING",
      stage: "ABANDONED_BOOKING",
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
    console.error("❌ Falha ao criar job real:", insertError);
    return;
  }

  console.log("✅ Job REAL criado:", job.id);

  // 5. Executar o processador
  console.log("⚙️ Executando processSingleFollowup...");
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
    sent_at: updatedJob.sent_at
  }, null, 2));

  if (updatedJob.status === "SENT") {
    console.log("✨ SUCESSO: O follow-up foi processado e ENVIADO!");
  } else {
    console.log("❌ FALHA: O job não foi enviado. Verifique os logs e metadados.");
    if (updatedJob.metadata?.last_error) {
       console.log("Erro capturado:", updatedJob.metadata.last_error);
    }
  }

  // 7. Verificar cron jobs no Supabase
  console.log("\n🕰️ Verificando agendamento pg_cron...");
  try {
     const { data: cronJobs } = await supabaseAdmin.rpc("read_query" as any, { 
       query: "SELECT jobname, schedule, active FROM cron.job" 
     } as any) as any;
     console.log("Cron Jobs:", cronJobs);

     const { data: cronRuns } = await supabaseAdmin.rpc("read_query" as any, { 
       query: "SELECT jobname, status, start_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5" 
     } as any) as any;
     console.log("Últimas execuções:", cronRuns);
  } catch (e) {
     console.log("⚠️ Não foi possível ler cron.job diretamente (pode exigir permissões de superuser).");
  }
}

testRealFollowup().catch(console.error);
