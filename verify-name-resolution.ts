import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function testWithRealName() {
  console.log("--- TESTE 1: CLIENTE COM NOME REAL (FABIO) ---");
  const testId = `test-fabio-${Date.now()}`;
  
  // 1. Criar job de teste
  const { data: job, error } = await supabaseAdmin.from("crm_followups").insert({
    phone: "5511999999999",
    status: "READY",
    stage: "TESTE",
    scheduled_at: new Date().toISOString(),
    rule_id: "a53d3d16-6f83-4715-a9ac-d045c59ef069",


    metadata: { 
      contact_name: "Fabio Luis Moreira",
      test: true,
      traceId: testId
    }
  } as any).select().single();

  if (error) throw error;

  console.log(`Job criado: ${job.id}`);
  
  // 2. Processar
  await processSingleFollowup(job, testId);
  
  // 3. Verificar resultado no banco
  const { data: updatedJob } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("id", job.id)
    .single();
    
  console.log("MENSAGEM FINAL (COM NOME):", updatedJob.message_template);
}

async function testWithoutName() {
  console.log("\n--- TESTE 2: CLIENTE SEM NOME ---");
  const testId = `test-anon-${Date.now()}`;
  
  const { data: job, error } = await supabaseAdmin.from("crm_followups").insert({
    phone: "5511888888888",
    status: "READY",
    stage: "TESTE",
    scheduled_at: new Date().toISOString(),
    rule_id: "00000000-0000-0000-0000-000000000000",

    metadata: { 
      contact_name: "Cliente", // Nome genérico que deve ser ignorado
      test: true,
      traceId: testId
    }
  } as any).select().single();

  if (error) throw error;

  await processSingleFollowup(job, testId);
  
  const { data: updatedJob } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("id", job.id)
    .single();
    
  console.log("MENSAGEM FINAL (SEM NOME):", updatedJob.message_template);
}

async function run() {
  try {
    await testWithRealName();
    await testWithoutName();
  } catch (e) {
    console.error("ERRO NO TESTE:", e);
  } finally {
    process.exit(0);
  }
}

run();
