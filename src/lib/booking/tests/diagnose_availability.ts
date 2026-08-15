import { supabaseAdmin } from "../../../integrations/supabase/client.server";

async function run() {
  console.log("=== DIAGNÓSTICO FORENSE DE DISPONIBILIDADE ===");

  const { data: recentTraces, error } = await supabaseAdmin
    .from("evo_trace_logs")
    .select("*")
    .eq("step", "MESSAGE_PARSED")
    .filter("payload->>textSnippet", "ilike", "%amanhã%")
    .order("timestamp", { ascending: false })
    .limit(10);

  if (error || !recentTraces?.length) {
    console.log("Nenhum trace recente com 'amanhã' encontrado.");
    return;
  }

  // Filtrar apenas traces de entrada (inbound)
  const inboundTrace = recentTraces.find(t => {
    const p = t.payload as any;
    return p?.direction !== "OUTBOUND_ECHO";
  });

  if (!inboundTrace) {
    console.log("Nenhum trace de entrada encontrado.");
    return;
  }

  const traceId = inboundTrace.trace_id;
  
  const { data: allSteps } = await supabaseAdmin
    .from("evo_trace_logs")
    .select("*")
    .eq("trace_id", traceId)
    .order("timestamp", { ascending: true });

  const stepsMap = new Map((allSteps || []).map(s => [s.step, s]));

  console.log("\n1. CASO REAL LOCALIZADO:");
  console.log("timestamp:", inboundTrace.timestamp);
  console.log("traceId:", traceId);
  console.log("instanceId:", inboundTrace.instance_id);
  console.log("texto do cliente:", (inboundTrace.payload as any)?.textSnippet);

  const contextLoaded = stepsMap.get("BOOKING_CONTEXT_LOADED");
  console.log("serviço resolvido:", (contextLoaded?.payload as any)?.service || "NÃO RESOLVIDO");
  console.log("serviceId:", (contextLoaded?.payload as any)?.serviceId || "AUSENTE");
  
  const nextSlot = stepsMap.get("NEXT_REQUIRED_SLOT");
  console.log("PRÓXIMO CAMPO A OBTER:", (nextSlot?.payload as any)?.slot);

  console.log("\n2. FERRAMENTA DE DISPONIBILIDADE:");
  console.log("arquivo = src/lib/chat.server.ts");
  console.log("função = list_slots");
  console.log("tool name = list_slots");

  console.log("\n3. TRILHA REAL:");
  console.log("SERVICE_RESOLVED =", stepsMap.has("BOOKING_CONTEXT_LOADED") ? "SIM" : "AUSENTE");
  console.log("AVAILABILITY_CHECK_STARTED =", stepsMap.has("tool_started: list_slots") ? "SIM" : "AUSENTE");
  console.log("AI_RESPONSE_GENERATED =", stepsMap.has("AI_RESPONSE_RECEIVED") ? "SIM" : "AUSENTE");
  console.log("EVOLUTION_SEND_SUCCESS =", stepsMap.has("EVOLUTION_SEND_SUCCESS") ? "SIM" : "AUSENTE");

  console.log("\n4. ANÁLISE DE BLOQUEIO:");
  if (!stepsMap.has("tool_started: list_slots")) {
    console.log("AVAILABILITY_CHECK_STARTED = AUSENTE");
    console.log("Causa provável: Gemini não selecionou a ferramenta list_slots.");
  }

  const agentResolved = stepsMap.get("AGENT_RESOLVED");
  console.log("\n6. VALIDAÇÃO DE UNIDADE:");
  console.log("unitId resolvido:", (agentResolved?.payload as any)?.unitId || "UNKNOWN");
  console.log("instanceId:", inboundTrace.instance_id);

  console.log("\n9. RESULTADO FINAL:");
  const inst = inboundTrace.instance_id || "";
  console.log("UNIDADE =", inst.includes("Boulevard") ? "BOULEVARD" : inst.includes("Ventura") ? "VENTURA" : "CENTRO");
  console.log("traceId =", traceId);
  console.log("foi chamada? =", stepsMap.has("tool_started: list_slots") ? "SIM" : "NÃO");
  console.log("último checkpoint =", (allSteps || []).pop()?.step);
}

run().catch(console.error);
