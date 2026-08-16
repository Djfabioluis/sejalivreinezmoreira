
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function auditAll() {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  console.log(`Auditing ALL instances since: ${since}`);

  const { data: logs, error } = await supabaseAdmin
    .from("evo_webhook_logs" as any)
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }

  console.log(`Found ${logs?.length || 0} total logs.`);

  for (const log of (logs as any[]) || []) {
    const bodyStr = JSON.stringify(log.payload);
    if (bodyStr && bodyStr.toLowerCase().includes("mão")) {
      console.log(`\n!!! MATCH FOUND !!!`);
      console.log(`Instance: ${log.instance}`);
      console.log(`Event: ${log.event}`);
      console.log(`Time: ${log.created_at}`);
      console.log(`Payload Sample: ${bodyStr.slice(0, 500)}`);
    }
    
    // Check for PRODUCTION_WEBHOOK_REACHED which I just added
    if (log.event === "PRODUCTION_WEBHOOK_REACHED") {
        console.log(`\n--- PRODUCTION_WEBHOOK_REACHED Detected ---`);
        console.log(`Time: ${log.created_at}`);
        console.log(`Payload: ${bodyStr}`);
    }
  }
}

auditAll();
