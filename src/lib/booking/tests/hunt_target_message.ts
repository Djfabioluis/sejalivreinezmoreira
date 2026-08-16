
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function audit() {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  console.log(`Auditing logs since: ${since}`);

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

  console.log(`Found ${logs?.length || 0} logs for Ventura.`);

  for (const log of (logs as any[]) || []) {
    console.log(`\n--- LOG: ${log.event} | Status: ${log.status} | Time: ${log.created_at} ---`);
    console.log(`MessageId: ${log.message_id}`);
    
    let payload: any = log.payload;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch(e) {}
    }

    if (payload?.traceId) console.log(`TraceId: ${payload.traceId}`);
    if (payload?.MESSAGE_TEXT_MATCH_TEST) console.log(`MATCH_TEST: ${payload.MESSAGE_TEXT_MATCH_TEST}`);
    
    // Check for "quero fazer mão hoje" in payload
    const bodyStr = JSON.stringify(payload);
    if (bodyStr && bodyStr.toLowerCase().includes("mão")) {
      console.log("!!! PARTIAL MATCH FOUND IN PAYLOAD (mão) !!!");
      console.log("Full Payload Sample:", bodyStr.slice(0, 1000));
    }
    
    if (log.error_detail) console.log(`Error: ${log.error_detail}`);
  }
}

audit();
