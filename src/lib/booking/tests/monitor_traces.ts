import { supabaseAdmin } from "../../../integrations/supabase/client.server";

async function monitorTraces() {
  console.log("=== MONITORAMENTO DE TRACES REAIS (ÚLTIMA HORA) ===");
  
  const { data: traces, error } = await supabaseAdmin
    .from('evo_trace_logs')
    .select('*')
    .gt('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false });

  if (error) {
    console.error("Erro ao buscar traces:", error);
    return;
  }

  if (!traces || traces.length === 0) {
    console.log("Nenhum trace encontrado na última hora. Aguardando mensagens reais no WhatsApp...");
    return;
  }

  // Agrupar por trace_id
  const tracesByTraceId = traces.reduce((acc: any, t: any) => {
    if (!acc[t.trace_id]) acc[t.trace_id] = [];
    acc[t.trace_id].push(t);
    return acc;
  }, {});

  for (const traceId in tracesByTraceId) {
    const steps = tracesByTraceId[traceId];
    const firstStep = steps[steps.length - 1]; // O primeiro cronologicamente
    const lastStep = steps[0];

    console.log(`\nTRACE_ID: ${traceId}`);
    console.log(`Instância: ${firstStep.instance_id}`);
    console.log(`Timestamp: ${firstStep.timestamp}`);
    
    // Tentar encontrar o payload da mensagem de entrada
    const inbound = steps.find((s: any) => s.step === 'webhook_received' || s.step === 'inbound_message');
    if (inbound?.payload) {
        console.log(`Mensagem Cliente: ${JSON.stringify(inbound.payload.text || inbound.payload.message?.conversation || "...")}`);
    }

    // Tentar encontrar o log de list_services
    const listServices = steps.find((s: any) => s.step === 'tool_completed' && s.payload?.tool === 'list_services');
    if (listServices) {
        console.log(`Tool list_services: CHAMADA`);
    }

    // Tentar encontrar logs de preço
    const priceLog = steps.find((s: any) => s.step === 'price_resolved' || s.payload?.price_resolved);
    if (priceLog) {
        console.log(`Preço Resolvido: ${JSON.stringify(priceLog.payload)}`);
    }

    // Tentar encontrar bloqueios
    const blocked = steps.find((s: any) => s.step === 'PRICE_MISMATCH_BLOCKED');
    if (blocked) {
        console.log(`RESULTADO: PRICE_MISMATCH_BLOCKED`);
    }

    // Resposta final
    const outbound = steps.find((s: any) => s.step === 'reply_sent' || s.step === 'outbound_message_sent');
    if (outbound?.payload) {
        console.log(`Resposta Julia: ${JSON.stringify(outbound.payload.text || "...")}`);
    }
  }
}

monitorTraces().catch(console.error);
