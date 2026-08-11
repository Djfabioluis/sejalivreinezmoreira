import { supabaseAdmin } from "../integrations/supabase/client.server";

async function main() {
  const messageId = "TEST_FLOW_1786473423216";
  
  const { data: logs, error } = await supabaseAdmin
    .from("evolution_audit_logs")
    .select("event, status, payload")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });

  if (error) {
    console.log("Erro ao buscar logs:", error);
    // Tentar outra tabela comum se evolution_audit_logs não existir
    const { data: logs2, error: error2 } = await supabaseAdmin
      .from("wa_audit_logs")
      .select("event, status, payload")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true });
    if (error2) console.log("Erro ao buscar logs (wa_audit_logs):", error2);
    else console.log("Logs encontrados em wa_audit_logs:", logs2);
    return;
  }

  console.log("\nCHECKPOINTS ALCANÇADOS:");
  logs?.forEach(log => {
    console.log(`[${log.event}] - ${log.status}`);
  });
}

main();
