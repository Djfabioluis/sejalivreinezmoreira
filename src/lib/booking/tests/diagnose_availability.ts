import { supabaseAdmin } from "../../../integrations/supabase/client.server";

async function run() {
  console.log("=== DIAGNÓSTICO FORENSE DE DISPONIBILIDADE (CASO ESPECÍFICO) ===");

  // Buscar conversas recentes com serviço e data no contexto
  const { data: convs, error: convError } = await supabaseAdmin
    .from("wa_conversas")
    .select("phone, customer_context")
    .not("customer_context->bookingContext->serviceId", "is", null)
    .not("customer_context->bookingContext->date", "is", null)
    .limit(5);

  if (convError || !convs?.length) {
    console.log("Nenhuma conversa recente com serviço e data encontrados no contexto.");
    return;
  }

  const targetConv = convs[0];
  const phone = targetConv.phone;

  // Buscar o último trace desse telefone
  const { data: traceSearch } = await supabaseAdmin
    .from("evo_trace_logs")
    .select("trace_id")
    .eq("conversation_id", phone)
    .order("timestamp", { ascending: false })
    .limit(1);

  if (!traceSearch?.length) {
    console.log(`Trace não encontrado para o telefone ${phone}`);
    return;
  }

  const traceId = traceSearch[0].trace_id;
  
  const { data: allSteps } = await supabaseAdmin
    .from("evo_trace_logs")
    .select("*")
    .eq("trace_id", traceId)
    .order("timestamp", { ascending: true });

  const stepsMap = new Map((allSteps || []).map(s => [s.step, s]));
  const firstStep = allSteps?.[0];

  console.log("\n1. CASO REAL LOCALIZADO:");
  console.log("timestamp:", firstStep?.timestamp);
  console.log("traceId:", traceId);
  console.log("instanceId:", firstStep?.instance_id);
  
  const parsed = stepsMap.get("MESSAGE_PARSED");
  console.log("texto do cliente:", (parsed?.payload as any)?.textSnippet || "N/A");

  const contextLoaded = stepsMap.get("BOOKING_CONTEXT_LOADED");
  console.log("serviço resolvido:", (contextLoaded?.payload as any)?.service || "N/A");
  console.log("serviceId:", (contextLoaded?.payload as any)?.serviceId || "N/A");
  console.log("data solicitada:", (contextLoaded?.payload as any)?.date || "N/A");

  console.log("\n2. FERRAMENTA DE DISPONIBILIDADE:");
  console.log("arquivo = src/lib/chat.server.ts");
  console.log("função = list_slots");
  console.log("tool name = list_slots");

  console.log("\n3. TRILHA REAL:");
  console.log("SERVICE_RESOLVED =", stepsMap.has("BOOKING_CONTEXT_LOADED") ? "SIM" : "AUSENTE");
  console.log("DATE_RESOLVED =", (contextLoaded?.payload as any)?.date ? "SIM" : "AUSENTE");
  console.log("AVAILABILITY_CHECK_STARTED =", stepsMap.has("tool_started: list_slots") ? "SIM" : "AUSENTE");
  console.log("AI_RESPONSE_GENERATED =", stepsMap.has("AI_RESPONSE_RECEIVED") ? "SIM" : "AUSENTE");

  if (!stepsMap.has("tool_started: list_slots")) {
    console.log("\n4. ANÁLISE DE BLOQUEIO:");
    console.log("AVAILABILITY_CHECK_STARTED = AUSENTE");
    const nextSlotStep = stepsMap.get("NEXT_REQUIRED_SLOT");
    console.log("PRÓXIMO CAMPO A OBTER:", (nextSlotStep?.payload as any)?.slot);
    console.log("Causa: A máquina de estados ou o Gemini decidiu não chamar a ferramenta.");
  }

  console.log("\n9. RESULTADO FINAL:");
  const inst = firstStep?.instance_id || "";
  console.log("UNIDADE =", inst.includes("Boulevard") ? "BOULEVARD" : inst.includes("Ventura") ? "VENTURA" : "CENTRO");
  console.log("traceId =", traceId);
  console.log("foi chamada? =", stepsMap.has("tool_started: list_slots") ? "SIM" : "NÃO");
}

run().catch(console.error);
