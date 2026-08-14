import { supabaseAdmin } from "../../../integrations/supabase/client.server";

async function monitorTraces() {
  console.log("=== MONITORAMENTO DE TRACES REAIS (ÚLTIMA HORA) ===");
  
  const { data: traces, error } = await supabaseAdmin
    .from('evo_trace_logs')
    .select('*')
    .gt('timestamp', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: true });

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
    const firstStep = steps[0];

    console.log(`\n==================================================`);
    console.log(`TRACE_ID: ${traceId}`);
    console.log(`Instância: ${firstStep.instance_id}`);
    console.log(`Timestamp: ${firstStep.timestamp}`);
    
    // 1. Mensagem de entrada
    const inbound = steps.find((s: any) => s.step === 'webhook_received' || s.step === 'inbound_message');
    if (inbound?.payload) {
        const text = inbound.payload.message?.conversation || inbound.payload.text || "...";
        console.log(`MENSAGEM DO CLIENTE: "${text}"`);
    }

    // 2. Chamada da Tool
    const listServices = steps.find((s: any) => s.step === 'tool_completed' && s.payload?.tool === 'list_services');
    if (listServices) {
        console.log(`LIST_SERVICES CHAMADA: SIM`);
    }

    // 3. Resolução de Ambiguidade / Candidatos
    const contextUpdate = steps.find((s: any) => s.payload?.context_patch);
    if (contextUpdate?.payload?.context_patch) {
        const patch = contextUpdate.payload.context_patch;
        if (patch['bookingContext.candidates']) {
            console.log(`CANDIDATOS BEMP: ${patch['bookingContext.candidates'].length} encontrados`);
            console.log(`SERVICE_CLARIFICATION_REQUIRED: true`);
        }
        if (patch['bookingContext.serviceId']) {
            console.log(`SERVICE ID SELECIONADO: ${patch['bookingContext.serviceId']}`);
        }
    }

    // 4. Preço e Auditoria
    const priceRes = steps.find((s: any) => s.step === 'price_resolved' || s.payload?.price_resolved);
    if (priceRes) {
        console.log(`OFFICIAL PRICE: ${priceRes.payload?.price || priceRes.payload?.officialPrice}`);
        console.log(`SERVICE_PRICE_RESOLVED: true`);
    }

    const blocked = steps.find((s: any) => s.step === 'PRICE_MISMATCH_BLOCKED');
    if (blocked) {
        console.log(`RESULTADO: PRICE_MISMATCH_BLOCKED (Alucinação impedida)`);
    }

    // 5. Resposta Final
    const outbound = steps.find((s: any) => s.step === 'reply_sent' || s.step === 'outbound_message_sent');
    if (outbound?.payload) {
        const reply = outbound.payload.text || outbound.payload.message?.conversation || "...";
        console.log(`RESPOSTA FINAL DA JULIA: "${reply}"`);
    }
  }
}

monitorTraces().catch(console.error);
