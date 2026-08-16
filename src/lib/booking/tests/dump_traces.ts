import { supabaseAdmin } from "../../../integrations/supabase/client.server";

async function dumpRecentTraces() {
  const { data: traces, error } = await supabaseAdmin
    .from('evo_trace_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(200);

  if (error) {
    console.error(error);
    return;
  }

  // Agrupar e filtrar apenas os que têm payload relevante
  const grouped = traces?.reduce((acc: any, t: any) => {
    if (!acc[t.trace_id]) acc[t.trace_id] = [];
    acc[t.trace_id].push(t);
    return acc;
  }, {});

  for (const tid in grouped) {
    const steps = grouped[tid].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    console.log(`\n--- TRACE: ${tid} ---`);
    steps.forEach((s: any) => {
      console.log(`[${s.step}] ${s.instance_id} | ${JSON.stringify(s.payload || {})}`);
    });
  }
}

dumpRecentTraces();
