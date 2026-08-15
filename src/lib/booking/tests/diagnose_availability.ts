import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BempService } from "@/lib/bemp-service.server";

async function run() {
  console.log("=== DIAGNÓSTICO FORENSE DE DISPONIBILIDADE ===");

  // 1. Localizar conversa real com intenção de agendamento (data/serviço)
  const { data: recentTraces, error } = await supabaseAdmin
    .from("evo_trace_logs")
    .select("*")
    .eq("step", "MESSAGE_PARSED")
    .filter("payload->>textSnippet", "ilike", "%amanhã%")
    .order("timestamp", { ascending: false })
    .limit(5);

  if (error || !recentTraces?.length) {
    console.log("Nenhum trace recente com 'amanhã' encontrado.");
    return;
  }

  const trace = recentTraces[0];
  const traceId = trace.trace_id;
  
  // Buscar todos os passos desse traceId
  const { data: allSteps } = await supabaseAdmin
    .from("evo_trace_logs")
    .select("*")
    .eq("trace_id", traceId)
    .order("timestamp", { ascending: true });

  console.log("\n1. CASO REAL LOCALIZADO:");
  console.log("timestamp:", trace.timestamp);
  console.log("traceId:", traceId);
  console.log("instanceId:", trace.instance_id);
  console.log("texto do cliente:", trace.payload?.textSnippet);

  const contextLoaded = allSteps?.find(s => s.step === "BOOKING_CONTEXT_LOADED");
  console.log("serviço resolvido:", contextLoaded?.payload?.service || "NÃO RESOLVIDO");
  console.log("serviceId:", contextLoaded?.payload?.serviceId || "AUSENTE");
  
  const nextSlot = allSteps?.find(s => s.step === "NEXT_REQUIRED_SLOT");
  console.log("PRÓXIMO CAMPO A OBTER:", nextSlot?.payload?.slot);

  console.log("\n2. FERRAMENTA DE DISPONIBILIDADE:");
  console.log("arquivo = src/lib/chat.server.ts");
  console.log("função = list_slots (dentro de buildTools)");
  console.log("tool name = list_slots");
  console.log("endpoint/API = BempService.listAvailableSlots");

  console.log("\n3. TRILHA REAL:");
  const stepsMap = new Map(allSteps?.map(s => [s.step, s]));
  
  console.log("SERVICE_RESOLVED =", stepsMap.has("BOOKING_CONTEXT_LOADED") ? "SIM" : "AUSENTE");
  console.log("AVAILABILITY_CHECK_STARTED =", stepsMap.has("tool_started: list_slots") ? "SIM" : "AUSENTE");
  console.log("AI_RESPONSE_GENERATED =", stepsMap.has("AI_RESPONSE_RECEIVED") ? "SIM" : "AUSENTE");
  console.log("EVOLUTION_SEND_SUCCESS =", stepsMap.has("EVOLUTION_SEND_SUCCESS") ? "SIM" : "AUSENTE");

  console.log("\n4. ANÁLISE DE BLOQUEIO:");
  if (!stepsMap.has("tool_started: list_slots")) {
    console.log("AVAILABILITY_CHECK_STARTED = AUSENTE");
    console.log("Causa provável: Gemini não selecionou a ferramenta list_slots.");
    console.log("Contexto disponível para o Gemini:");
    console.log(JSON.stringify(contextLoaded?.payload, null, 2));
  }

  console.log("\n6. VALIDAÇÃO DE UNIDADE:");
  const agentResolved = allSteps?.find(s => s.step === "AGENT_RESOLVED");
  console.log("unitId resolvido:", agentResolved?.payload?.unitId || "UNKNOWN");
  console.log("instanceId:", trace.instance_id);

  console.log("\n9. RESULTADO FINAL:");
  console.log("UNIDADE =", trace.instance_id.includes("Boulevard") ? "BOULEVARD" : trace.instance_id.includes("Ventura") ? "VENTURA" : "CENTRO");
  console.log("traceId =", traceId);
  console.log("foi chamada? =", stepsMap.has("tool_started: list_slots") ? "SIM" : "NÃO");
  console.log("erro/bloqueio = Ferramenta não invocada pelo modelo.");
}

run().catch(console.error);
