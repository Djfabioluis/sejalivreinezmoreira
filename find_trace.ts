import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function findTrace() {
  // Use raw query for jsonb text search or just list recent logs and filter in JS
  const { data: logs, error } = await supabaseAdmin
    .from('evo_trace_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(300);

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }

  const fabioJid = "5541992495561";
  const targetText = "as 18";

  const relevant = logs?.filter(l => {
    const p = JSON.stringify(l.payload || {});
    return p.includes(fabioJid) || p.toLowerCase().includes(targetText);
  });

  if (!relevant || relevant.length === 0) {
    console.log("No relevant logs found in last 300 records.");
    return;
  }

  // Group by trace_id to see the flow
  const grouped = relevant.reduce((acc: any, l: any) => {
    if (!acc[l.trace_id]) acc[l.trace_id] = [];
    acc[l.trace_id].push(l);
    return acc;
  }, {});

  for (const tid in grouped) {
    const steps = grouped[tid].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    console.log(`\n--- TRACE: ${tid} ---`);
    steps.forEach((s: any) => {
      console.log(`[${s.timestamp}] ${s.step} | ${JSON.stringify(s.payload || {})}`);
    });
  }
}

findTrace();
