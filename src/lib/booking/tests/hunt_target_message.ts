
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function audit() {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  console.log(`Auditing logs since: ${since}`);

  const { data: logs, error } = await supabaseAdmin
    .from("evo_webhook_logs")
    .select("*")
    .eq("instance", "agente-5541998803684")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }

  console.log(`Found ${logs?.length || 0} logs for Ventura.`);

  for (const log of logs || []) {
    console.log(`\n--- LOG: ${log.event} | Status: ${log.status} | Time: ${log.created_at} ---`);
    console.log(`MessageId: ${log.message_id}`);
    
    let payload = log.payload;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch(e) {}
    }

    if (payload?.traceId) console.log(`TraceId: ${payload.traceId}`);
    if (payload?.MESSAGE_TEXT_MATCH_TEST) console.log(`MATCH_TEST: ${payload.MESSAGE_TEXT_MATCH_TEST}`);
    
    // Check for "quero fazer mão hoje" in payload
    const bodyStr = JSON.stringify(payload);
    if (bodyStr.includes("quero fazer mão hoje")) {
      console.log("!!! TARGET MESSAGE FOUND IN PAYLOAD !!!");
      console.log("Full Payload Sample:", bodyStr.slice(0, 500));
    }
    
    if (log.error_detail) console.log(`Error: ${log.error_detail}`);
  }
}

audit();
