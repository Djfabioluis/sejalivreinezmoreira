import { supabaseAdmin } from "./src/integrations/supabase/client.server";
import { processPendingFollowups } from "./src/lib/crm/followup-processor.server";
import { logger } from "./src/lib/observability/logger.server";

async function runDiagnostic() {
  console.log("=== INICIANDO DIAGNÓSTICO DE FOLLOW-UP ===");
  
  // 1. Verificar registros pendentes
  const { data: pendentes, count } = await supabaseAdmin
    .from("crm_followups")
    .select("*", { count: 'exact' })
    .eq("status", "PENDENTE");
  
  console.log(`Follow-ups PENDENTES no banco: ${count || 0}`);
  if (pendentes && pendentes.length > 0) {
    console.log("Exemplo de PENDENTE:", JSON.stringify(pendentes[0], null, 2));
  }

  // 2. Verificar registros elegíveis
  const now = new Date().toISOString();
  const { data: elegiveis } = await supabaseAdmin
    .from("crm_followups")
    .select("*, crm_customer_pipeline(conversion_score)")
    .eq("status", "PENDENTE")
    .lte("scheduled_at", now)
    .lt("attempts", 3);
  
  console.log(`Follow-ups ELEGÍVEIS agora: ${elegiveis?.length || 0}`);

  // 3. Verificar instâncias de WhatsApp
  const { data: conversas } = await supabaseAdmin
    .from("wa_conversas")
    .select("phone, instance, phone_number, status")
    .limit(5);
  console.log("Amostra de wa_conversas:", JSON.stringify(conversas, null, 2));

  // 4. Executar o processador
  console.log("Executando processPendingFollowups()...");
  try {
    await processPendingFollowups();
    console.log("Processador finalizado.");
  } catch (err) {
    console.error("Erro na execução do processador:", err);
  }
}

runDiagnostic().catch(console.error);
