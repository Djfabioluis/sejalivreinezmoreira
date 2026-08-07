import { supabaseAdmin } from "./src/integrations/supabase/client.server.ts";

async function runAudit() {
  console.log("=== AUDITORIA DE TABELAS CRM ===");
  
  const { data: pipelines } = await supabaseAdmin.from("crm_customer_pipeline").select("phone, current_stage, last_interaction_at").limit(5);
  console.log("Amostra crm_customer_pipeline:", pipelines);

  const { data: followups } = await supabaseAdmin.from("crm_followups").select("phone, status, stage, scheduled_at, attempts").limit(5);
  console.log("Amostra crm_followups:", followups);

  const { count: pendingCount } = await supabaseAdmin.from("crm_followups").select("*", { count: 'exact', head: true }).eq("status", "PENDING");
  console.log(`Follow-ups PENDING (Inglês): ${pendingCount}`);

  const { count: pendenteCount } = await supabaseAdmin.from("crm_followups").select("*", { count: 'exact', head: true }).eq("status", "PENDENTE");
  console.log(`Follow-ups PENDENTE (Português): ${pendenteCount}`);
}

runAudit().catch(console.error);
