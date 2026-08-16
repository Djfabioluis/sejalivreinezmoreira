
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function hunt() {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  console.log(`Auditing ALL evo_trace_logs since: ${since}`);

  const { data: traces, error } = await supabaseAdmin
    .from('evo_trace_logs')
    .select('*')
    .gte('timestamp', since)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const latest = (traces || []);
  console.log(`Found ${latest.length} trace steps.`);

  for (const log of latest.slice(0, 50)) {
    console.log(`[${log.timestamp}] Step: ${log.step} | Instance: ${log.instance_id}`);
    const bodyStr = JSON.stringify(log.payload);
    if (bodyStr.toLowerCase().includes("mão")) {
        console.log(`!!! MATCH FOUND !!!`);
        console.log(`Payload: ${bodyStr}`);
    }
  }
}

hunt();
