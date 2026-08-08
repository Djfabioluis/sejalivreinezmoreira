import { processSingleFollowup } from "./src/lib/crm/followup-processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function test() {
  console.log("🚀 Iniciando teste de erro da IA...");
  
  const { data: job, error } = await supabaseAdmin.from("crm_followups").insert({
    phone: "5511999999999",
    status: "READY",
    scheduled_at: new Date().toISOString(),
    rule_id: "00000000-0000-0000-0000-000000000000",
    stage: "test", // Corrigindo erro de constraint
    metadata: { test: true, force_ai_error: true }
  }).select().single();

  if (error) {
    console.error("Erro ao criar job:", error);
    return;
  }

  console.log("Job criado:", job.id);

  try {
    await processSingleFollowup(job, "test-trace");
  } catch (e: any) {
    console.log("Erro capturado no teste:", e.message);
  }

  const { data: updatedJob } = await supabaseAdmin
    .from("crm_followups")
    .select("status, metadata")
    .eq("id", job.id)
    .single();

  console.log("Status final no banco:", updatedJob?.status);
  console.log("Metadata last_error:", JSON.stringify(updatedJob?.metadata?.last_error, null, 2));
}

test().catch(console.error);
