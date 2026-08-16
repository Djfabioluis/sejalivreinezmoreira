
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function audit() {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  console.log(`Auditing logs since: ${since}`);

  const { data: logs, error } = await supabaseAdmin
    .from("evo_webhook_logs" as any)
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }

  const latest = (logs as any[]) || [];
  console.log(`Found ${latest.length} logs.`);

  for (const log of latest.slice(0, 20)) {
    console.log(`[${log.created_at}] Event: ${log.event} | Instance: ${log.instance}`);
  }
}

audit();
