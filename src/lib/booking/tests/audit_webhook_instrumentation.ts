
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

  const matches = (logs as any[]) || [];
  console.log(`Found ${matches.length} logs.`);

  for (const log of matches.slice(0, 50)) {
    console.log(`\n--- LOG: ${log.event} | Time: ${log.created_at} ---`);
    console.log(`Instance: ${log.instance}`);
    const bodyStr = JSON.stringify(log.payload);
    if (bodyStr.toLowerCase().includes("mão")) {
        console.log(`!!! MATCH FOUND !!!`);
        console.log(`Payload: ${bodyStr}`);
    } else {
        console.log(`Snippet: ${bodyStr.slice(0, 200)}`);
    }
  }
}

audit();
