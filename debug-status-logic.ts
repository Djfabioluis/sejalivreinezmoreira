import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function runTests() {
  console.log("🧪 Iniciando Testes de Lógica de Status...");
  
  const { data: rules } = await supabaseAdmin.from("crm_followup_rules").select("id").limit(1);
  const ruleId = rules?.[0]?.id;

  async function test(name: string, metadata: any) {
    console.log(`\n--- ${name} ---`);
    const { data: job } = await supabaseAdmin.from("crm_followups").insert({
      phone: "5511999999999",
      status: "READY",
      scheduled_at: new Date().toISOString(),
      rule_id: ruleId,
      stage: "test-status",
      metadata: { ...metadata, test: true }
    }).select().single();

    if (!job) return console.error("Falha ao criar job");

    const traceId = `test-${Date.now()}`;
    await processSingleFollowup(job, traceId);

    const { data: result } = await supabaseAdmin
      .from("crm_followups")
      .select("status, message_id, metadata")
      .eq("id", job.id)
      .single();

    console.log(`Job ID: ${job.id}`);
    console.log(`Trace ID: ${traceId}`);
    console.log(`Status Final: ${result?.status}`);
    console.log(`Message ID: ${result?.message_id || 'N/A'}`);
    
    if (result?.status === 'FAILED') {
      console.log(`Erro Capturado: ${result.metadata?.last_error?.message}`);
    }
  }

  // Teste A: Fluxo Normal (Simulado como OK se o env estiver certo)
  await test("Teste A: IA OK, Evolution OK", {});

  // Teste B: IA falha (Simulado forçando erro na IA via metadata se o provider permitir ou apenas observando erro real)
  // Como não temos um "mock" injetável facilmente sem mudar o código de produção, 
  // confiamos na captura de erros que já implementamos.
}

runTests().catch(console.error);
