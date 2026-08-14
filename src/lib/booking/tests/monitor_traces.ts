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
    
    // 1. Mensagem de entrada (MESSAGE_PARSED contém o texto)
    const parsed = steps.find((s: any) => s.step === 'MESSAGE_PARSED');
    if (parsed?.payload) {
        const text = parsed.payload.text || "...";
        console.log(`MENSAGEM DO CLIENTE: "${text}"`);
    }

    // 2. Chamada da Tool (BEMP_SERVICE_LOOKUP_STARTED/COMPLETED)
    const lookup = steps.find((s: any) => s.step === 'BEMP_SERVICE_LOOKUP_COMPLETED');
    if (lookup) {
        console.log(`LIST_SERVICES CHAMADA: SIM`);
    }

    // 3. Ambiguidade / Contexto
    const contextMerged = steps.find((s: any) => s.step === 'BOOKING_CONTEXT_MERGED');
    if (contextMerged?.payload) {
        const ctx = contextMerged.payload.context || contextMerged.payload;
        if (ctx.clarificationRequired) {
            console.log(`CANDIDATOS BEMP: ${ctx.candidates?.length || "Múltiplos"} encontrados`);
            console.log(`SERVICE_CLARIFICATION_REQUIRED: true`);
        }
        if (ctx.serviceId) {
            console.log(`SERVICE ID SELECIONADO: ${ctx.serviceId}`);
        }
    }

    // 4. Preço e Auditoria
    const blocked = steps.find((s: any) => s.step === 'PRICE_MISMATCH_BLOCKED');
    if (blocked) {
        console.log(`RESULTADO: PRICE_MISMATCH_BLOCKED (Alucinação impedida)`);
        if (blocked.payload) {
            console.log(`Detalhes: ${JSON.stringify(blocked.payload)}`);
        }
    }

    // 5. Resposta Final (EVOLUTION_SEND_STARTED contém o texto da Julia)
    const evolution = steps.find((s: any) => s.step === 'EVOLUTION_SEND_STARTED');
    if (evolution?.payload) {
        const reply = evolution.payload.text || "...";
        console.log(`RESPOSTA FINAL DA JULIA: "${reply}"`);
    }
  }
}

monitorTraces().catch(console.error);
