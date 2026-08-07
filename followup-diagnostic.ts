import { supabaseAdmin } from "./src/integrations/supabase/client.server.ts";
import { processPendingFollowups } from "./src/lib/crm/followup-processor.server.ts";

async function runDiagnostic() {
  console.log("=== INICIANDO DIAGNÓSTICO DE FOLLOW-UP ===");
  
  const { data: pendentes, count } = await supabaseAdmin
    .from("crm_followups")
    .select("*", { count: 'exact' })
    .eq("status", "PENDENTE");
  
  console.log(`Follow-ups PENDENTES no banco: ${count || 0}`);

  const now = new Date().toISOString();
  const { data: elegiveis } = await supabaseAdmin
    .from("crm_followups")
    .select("*, crm_customer_pipeline(conversion_score)")
    .eq("status", "PENDENTE")
    .lte("scheduled_at", now)
    .lt("attempts", 3);
  
  console.log(`Follow-ups ELEGÍVEIS agora: ${elegiveis?.length || 0}`);

  console.log("Executando processPendingFollowups()...");
  try {
    await processPendingFollowups();
    console.log("Processador finalizado.");
  } catch (err) {
    console.error("Erro na execução do processador:", err);
  }
}

runDiagnostic().catch(console.error);
