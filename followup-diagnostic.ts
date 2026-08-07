import { supabaseAdmin } from "./src/integrations/supabase/client.server.ts";
import { processPendingFollowups } from "./src/lib/crm/followup-processor.server.ts";

async function runDiagnostic() {
  console.log("=== INICIANDO DIAGNÓSTICO DE FOLLOW-UP ===");
  
  // Testar conectividade administrativa
  try {
    const { count, error } = await supabaseAdmin.from("crm_followups").select("*", { count: 'exact', head: true });
    if (error) throw error;
    console.log(`Conexão Administrativa OK. Total follow-ups: ${count}`);
  } catch (err: any) {
    console.error("ERRO DE CONEXÃO ADMINISTRATIVA:", err.message);
    process.exit(1);
  }

  const { count: pendentes } = await supabaseAdmin
    .from("crm_followups")
    .select("*", { count: 'exact', head: true })
    .eq("status", "PENDENTE");
  
  console.log(`Follow-ups PENDENTES no banco: ${pendentes || 0}`);

  const now = new Date().toISOString();
  const { data: elegiveis } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("status", "PENDENTE")
    .lte("scheduled_at", now)
    .lt("attempts", 3);
  
  console.log(`Follow-ups ELEGÍVEIS agora: ${elegiveis?.length || 0}`);

  console.log("Executando processPendingFollowups()...");
  try {
    await processPendingFollowups();
    console.log("Processador finalizado.");
  } catch (err: any) {
    console.error("Erro fatal na execução do processador:", err.message);
  }
}

runDiagnostic().catch(console.error);
