
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function hunt() {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  console.log(`Auditing ALL tables for "mão" since: ${since}`);

  // 1. evo_webhook_logs
  const { data: weblogs } = await supabaseAdmin.from('evo_webhook_logs' as any).select('*').gte('created_at', since);
  const webmatches = (weblogs as any[])?.filter(l => JSON.stringify(l).toLowerCase().includes("mão")) || [];
  console.log(`evo_webhook_logs matches: ${webmatches.length}`);
  
  // 2. evo_trace_logs
  const { data: traces } = await supabaseAdmin.from('evo_trace_logs').select('*').gte('timestamp', since);
  const tracematches = (traces as any[])?.filter(l => JSON.stringify(l).toLowerCase().includes("mão")) || [];
  console.log(`evo_trace_logs matches: ${tracematches.length}`);

  // 3. wa_conversas
  const { data: convs } = await supabaseAdmin.from('wa_conversas').select('*').gte('updated_at', since);
  const convmatches = (convs as any[])?.filter(l => JSON.stringify(l).toLowerCase().includes("mão")) || [];
  console.log(`wa_conversas matches: ${convmatches.length}`);

  for (const log of webmatches) {
      console.log(`\n--- WEBHOOK LOG ---`);
      console.log(`Time: ${log.created_at} | Event: ${log.event} | Instance: ${log.instance}`);
      console.log(`Payload: ${JSON.stringify(log.payload)}`);
  }
}

hunt();
