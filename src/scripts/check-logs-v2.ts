import { supabaseAdmin } from "../integrations/supabase/client.server";

async function main() {
  const messageId = "TEST_FLOW_1786473423216";
  
  const { data: logs, error } = await supabaseAdmin
    .from("evo_webhook_logs")
    .select("event, status, payload")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });

  if (error) {
    console.log("Erro ao buscar logs (evo_webhook_logs):", error);
    return;
  }

  console.log("\nCHECKPOINTS ALCANÇADOS (evo_webhook_logs):");
  logs?.forEach(log => {
    console.log(`[${log.event}] - ${log.status}`);
  });
}

main();
