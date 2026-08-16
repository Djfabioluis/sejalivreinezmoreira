
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function deepAudit() {
  const { data: traces, error } = await supabaseAdmin
    .from('evo_trace_logs')
    .select('*')
    .gt('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const grouped = (traces || []).reduce((acc: any, t: any) => {
    if (!acc[t.trace_id]) acc[t.trace_id] = [];
    acc[t.trace_id].push(t);
    return acc;
  }, {});

  for (const tid in grouped) {
    const steps = grouped[tid];
    const first = steps[0];
    const parsed = steps.find((s: any) => s.step === 'MESSAGE_PARSED');
    const toolStarted = steps.find((s: any) => s.step === 'tool_started' && s.payload?.tool === 'list_services');
    const contextMerged = steps.find((s: any) => s.step === 'BOOKING_CONTEXT_MERGED');
    const evoStarted = steps.find((s: any) => s.step === 'EVOLUTION_SEND_STARTED');

    const bodyStr = JSON.stringify(steps);
    const isTarget = bodyStr.toLowerCase().includes("mão") || bodyStr.includes("AC94D2D15029C78C19E1AEC0F95158AD");

    if (isTarget) {
        console.log(`\n!!! TARGET TRACE FOUND !!!`);
        console.log(`TRACE: ${tid} | Instância: ${first.instance_id} | Time: ${first.timestamp}`);
        steps.forEach((s: any) => {
            console.log(`  [${s.timestamp}] Step: ${s.step}`);
            if (s.step === 'MESSAGE_PARSED') console.log(`    TEXT: "${s.payload?.text}"`);
            if (s.step === 'EVOLUTION_SEND_STARTED') console.log(`    REPLY: "${s.payload?.text}"`);
        });
    }
  }
}

deepAudit();
