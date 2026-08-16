import { supabaseAdmin } from "../../../integrations/supabase/client.server";

async function monitorRealTime() {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
  
  const { data: traces, error } = await supabaseAdmin
    .from('evo_trace_logs')
    .select('*')
    .gt('timestamp', oneMinuteAgo)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error("Erro no monitoramento:", error);
    return;
  }

  if (!traces || traces.length === 0) return;

  const tracesByTraceId = traces.reduce((acc: any, t: any) => {
    if (!acc[t.trace_id]) acc[t.trace_id] = [];
    acc[t.trace_id].push(t);
    return acc;
  }, {});

  for (const traceId in tracesByTraceId) {
    const steps = tracesByTraceId[traceId];
    const firstStep = steps[0];
    
    // Filtro para garantir que é uma mensagem nova de entrada
    const hasWebhookReceived = steps.some((s: any) => s.step === 'WHATSAPP_WEBHOOK_RECEIVED');
    if (!hasWebhookReceived) continue;

    console.log(`\n[NOVA MENSAGEM REAL DETECTADA]`);
    console.log(`TRACE_ID: ${traceId}`);
    console.log(`INSTÂNCIA: ${firstStep.instance_id}`);
    console.log(`TIMESTAMP: ${firstStep.timestamp}`);

    const parsed = steps.find((s: any) => s.step === 'MESSAGE_PARSED');
    if (parsed?.payload?.text) {
      console.log(`TEXTO RECEBIDO: "${parsed.payload.text}"`);
      console.log(`CONVERSATION_ID: ${parsed.payload.key?.remoteJid || "mascarado"}`);
    }

    const toolCall = steps.find((s: any) => s.step === 'tool_started' && s.payload?.tool === 'list_services');
    console.log(`CHAMADA LIST_SERVICES: ${toolCall ? 'SIM' : 'NÃO'}`);

    const context = steps.find((s: any) => s.step === 'BOOKING_CONTEXT_MERGED')?.payload;
    if (context) {
      console.log(`CANDIDATOS BEMP: ${context.candidates?.length || 0}`);
      console.log(`SERVICE_CLARIFICATION_REQUIRED: ${!!context.clarificationRequired}`);
      console.log(`SERVICE_PRICE_RESOLVED: ${!!context.serviceId}`);
      if (context.serviceId) console.log(`SERVICE ID SELECIONADO: ${context.serviceId}`);
    }

    const blocked = steps.find((s: any) => s.step === 'PRICE_MISMATCH_BLOCKED');
    console.log(`PRICE_MISMATCH_BLOCKED: ${blocked ? 'SIM' : 'NÃO'}`);

    const evolution = steps.find((s: any) => s.step === 'EVOLUTION_SEND_STARTED');
    if (evolution?.payload?.text) {
      console.log(`RESPOSTA JULIA: "${evolution.payload.text}"`);
      console.log(`ENVIADO EVOLUTION: SIM`);
    }
  }
}

// Loop de polling para o monitor
console.log("MONITORAMENTO ATIVO - AGUARDANDO MENSAGENS NO WHATSAPP...");
setInterval(() => {
  monitorRealTime().catch(console.error);
}, 5000);
