import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function checkRuntime() {
  const { data: logs, error } = await supabaseAdmin
    .from('evo_trace_logs')
    .select('*')
    .eq('trace_id', 'webhook-1786988374564')
    .order('timestamp', { ascending: true });

  if (error) {
    console.error("Error fetching trace:", error);
    return;
  }

  console.log("TRACE_DATA:");
  logs.forEach(l => {
    console.log(`[${l.timestamp}] ${l.step} | ${JSON.stringify(l.payload)}`);
  });
}

checkRuntime();
