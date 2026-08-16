
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function auditProcessorPerformance() {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  console.log(`Auditing Performance Logs since: ${since}`);

  const { data: logs, error } = await supabaseAdmin
    .from("evo_webhook_logs" as any)
    .select("*")
    .eq("instance", "agente-5541998803684")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }

  console.log(`Found ${logs?.length || 0} total logs for Ventura.`);

  for (const log of (logs as any[]) || []) {
      console.log(`\n--- LOG: ${log.event} | Time: ${log.created_at} ---`);
      console.log(`Payload: ${JSON.stringify(log.payload)}`);
  }
}

auditProcessorPerformance();
