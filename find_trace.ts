import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function findTrace() {
  const { data: logs, error } = await supabaseAdmin
    .from('evo_trace_logs')
    .select('*')
    .ilike('payload::text', '%as 18%')
    .order('timestamp', { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log("No logs found matching 'as 18'");
    // Try broader search for Fabio's JID
    const { data: recent, error: err2 } = await supabaseAdmin
      .from('evo_trace_logs')
      .select('*')
      .ilike('payload::text', '%5541992495561%')
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (recent) {
      console.log("Recent logs for Fabio:", recent.length);
      recent.forEach(r => {
         console.log(`[${r.timestamp}] ${r.trace_id} | ${r.step} | ${JSON.stringify(r.payload).slice(0, 100)}`);
      });
    }
    return;
  }

  logs.forEach(log => {
    console.log(`[${log.timestamp}] TRACE_ID: ${log.trace_id} | STEP: ${log.step}`);
    console.log(JSON.stringify(log.payload, null, 2));
  });
}

findTrace();
