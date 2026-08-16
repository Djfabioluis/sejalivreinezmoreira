
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

  console.log(`Found ${traces?.length || 0} trace steps.`);

  const grouped = (traces || []).reduce((acc: any, t: any) => {
    if (!acc[t.trace_id]) acc[t.trace_id] = [];
    acc[t.trace_id].push(t);
    return acc;
  }, {});

  for (const tid in grouped) {
    const steps = grouped[tid];
    const textStep = steps.find((s: any) => JSON.stringify(s.payload).toLowerCase().includes("mão"));
    
    if (textStep) {
        console.log(`\n!!! MATCH IN TRACE: ${tid} !!!`);
        steps.forEach((s: any) => {
            console.log(`  [${s.timestamp}] Step: ${s.step} | Payload: ${JSON.stringify(s.payload)}`);
        });
    }
  }
}

hunt();
