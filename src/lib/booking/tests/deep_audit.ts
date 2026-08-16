import { supabaseAdmin } from "../../../integrations/supabase/client.server";

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

    // Se tiver pelo menos um dado relevante, mostramos
    if (parsed || toolStarted || contextMerged || evoStarted) {
        console.log(`\nTRACE: ${tid} | Instância: ${first.instance_id}`);
        if (parsed?.payload?.text) console.log(`  MENSAGEM: "${parsed.payload.text}"`);
        if (toolStarted) console.log(`  LIST_SERVICES: CHAMADA`);
        
        if (contextMerged?.payload) {
            const ctx = contextMerged.payload.context || contextMerged.payload;
            if (ctx.clarificationRequired) console.log(`  AMBIGUIDADE: SIM (${ctx.candidates?.length} candidatos)`);
            if (ctx.serviceId) console.log(`  SERVICE_ID: ${ctx.serviceId} (${ctx.serviceName})`);
        }

        if (evoStarted?.payload?.text) console.log(`  RESPOSTA JULIA: "${evoStarted.payload.text}"`);
    }
  }
}

deepAudit();
