
import { supabase } from "../../integrations/supabase/client";
import { findAgentByInstance } from "../evolution/outbound-resolver.server";
import { list_slots } from "../chat.server";

async function diagnoseVenturaLeak() {
  console.log("=== INICIANDO DIAGNÓSTICO FORENSE VENTURA ===");

  // 1. Localizar caso real Ventura
  const { data: logs, error: logError } = await supabase
    .from('evo_trace_logs')
    .select('*')
    .eq('instance_id', 'agente-5541998803684')
    .order('created_at', { ascending: false })
    .limit(20);

  if (logError || !logs || logs.length === 0) {
    console.log("CASO REAL VENTURA ENCONTRADO = NÃO (Sem logs recentes para esta instância)");
    return;
  }

  const latestTrace = logs[0];
  const conversationId = latestTrace.conversation_id;
  const traceData = latestTrace.trace_data as any;

  console.log("CASO REAL VENTURA ENCONTRADO = SIM");
  console.log("conversationId =", conversationId);
  console.log("instanceId inbound = agente-5541998803684");

  // 2. Verificar resolução de unidade
  const agent = await findAgentByInstance('agente-5541998803684');
  console.log("unitId obtido de wa_agentes =", agent?.unidade_id);
  
  const bookingContext = traceData?.bookingContext || {};
  console.log("bookingContext.unitId =", bookingContext.unitId);
  console.log("serviceId =", bookingContext.serviceId);

  // 3. Auditar chamadas de ferramenta
  const toolCalls = Array.isArray(traceData?.tool_calls) ? traceData.tool_calls : [];
  const availabilityCall = toolCalls.find((c: any) => c.function?.name === 'list_slots');

  if (availabilityCall) {
    const args = JSON.parse(availabilityCall.function.arguments);
    console.log("AVAILABILITY_TOOL_CALLED = SIM");
    console.log("UNITID ENVIADO AO LIST_SLOTS =", args.unitId);
    
    // Teste comparativo se tivermos data
    if (args.date && bookingContext.serviceId) {
       console.log("\n--- TESTE COMPARATIVO BEMP ---");
       try {
         const venturaSlots = await list_slots.handler({ unitId: 1377, serviceId: bookingContext.serviceId, date: args.date });
         const centroSlots = await list_slots.handler({ unitId: 1378, serviceId: bookingContext.serviceId, date: args.date });
         
         console.log("SLOTS VENTURA (1377) =", venturaSlots.length);
         console.log("SLOTS CENTRO (1378) =", centroSlots.length);
         
         const juliaReply = traceData?.ai_response || "";
         console.log("HORÁRIOS OFERECIDOS PELA JULIA =", juliaReply);
         
         const isCentro = centroSlots.some((s: any) => juliaReply.includes(s.time));
         const isVentura = venturaSlots.some((s: any) => juliaReply.includes(s.time));
         
         console.log("HORÁRIOS ERAM DO CENTRO =", isCentro ? "SIM" : "NÃO");
         console.log("HORÁRIOS ERAM DO VENTURA =", isVentura ? "SIM" : "NÃO");
       } catch (e) {
         console.error("Erro no teste comparativo:", e);
       }
    }
  } else {
    console.log("AVAILABILITY_TOOL_CALLED = NÃO");
  }

  // 4. Auditoria de Vazamento (Busca por fallbacks ou unitId hardcoded)
  console.log("\n--- AUDITORIA DE CÓDIGO ---");
}

diagnoseVenturaLeak().catch(console.error);
