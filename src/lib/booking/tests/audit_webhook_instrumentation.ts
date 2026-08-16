
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function auditWebhookLogs() {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  console.log(`Auditing ALL evo_webhook_logs since: ${since}`);

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
    
    // Check for the events I added to the route
    if (log.event === "PRODUCTION_WEBHOOK_REACHED" || 
        log.event === "BODY_PARSE_STARTED" || 
        log.event === "BODY_PARSE_SUCCESS" ||
        log.event === "WEBHOOK_RAW_RECEIVED") {
        console.log(`\n!!! INSTRUMENTED EVENT DETECTED !!!`);
        console.log(`Time: ${log.created_at}`);
        console.log(`Event: ${log.event}`);
        console.log(`Instance: ${log.instance}`);
        console.log(`Payload: ${bodyStr}`);
    }
    
    if (bodyStr && bodyStr.toLowerCase().includes("mão")) {
      console.log(`\n!!! CONTENT MATCH FOUND !!!`);
      console.log(`Time: ${log.created_at}`);
      console.log(`Event: ${log.event}`);
      console.log(`Payload: ${bodyStr.slice(0, 500)}`);
    }
  }
}

auditWebhookLogs();
