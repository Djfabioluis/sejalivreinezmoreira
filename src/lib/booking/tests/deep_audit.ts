
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

  const recentTids = new Set(latest.slice(0, 50).map(l => l.trace_id));
  
  for (const tid of recentTids) {
      const steps = latest.filter(l => l.trace_id === tid);
      const isMao = steps.some(s => JSON.stringify(s.payload).toLowerCase().includes("mão"));
      if (isMao) {
          console.log(`\n!!! MATCH IN TRACE: ${tid} !!!`);
          steps.reverse().forEach(s => {
              console.log(`  [${s.timestamp}] Step: ${s.step} | Payload: ${JSON.stringify(s.payload)}`);
          });
      }
  }
}

hunt();
