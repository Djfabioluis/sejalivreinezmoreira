import { supabaseAdmin } from "../../../integrations/supabase/client.server";
import { BempService } from "../../bemp-service.server";

async function diagnoseVenturaLeak() {
  console.log("=== INICIANDO DIAGNÓSTICO FORENSE VENTURA ===");

  // 1. Localizar caso real Ventura
  const { data: logs, error: logError } = await supabaseAdmin
    .from('evo_trace_logs')
    .select('*')
    .eq('instance_id', 'agente-5541998803684')
    .order('created_at', { ascending: false })
    .limit(50);

  if (logError || !logs || logs.length === 0) {
    console.log("CASO REAL VENTURA ENCONTRADO = NÃO (Sem logs recentes para esta instância)");
    return;
  }

  // Filtrar por traces que chamaram list_slots no payload do trace_data
  const latestTrace = logs.find((l: any) => {
    const td = l.payload as any; // Em algumas versões do log, os tool_calls estão no payload
    const calls = Array.isArray(td?.tool_calls) ? td.tool_calls : [];
    return calls.some((c: any) => c.function?.name === 'list_slots');
  }) || logs[0];

  const conversationId = latestTrace.conversation_id;
  const traceData = (latestTrace.payload as any) || {};

  console.log("CASO REAL VENTURA ENCONTRADO = SIM");
  console.log("conversationId =", conversationId);
  console.log("instanceId inbound = agente-5541998803684");

  // 2. Verificar resolução de unidade na wa_agentes
  const { data: agent } = await supabaseAdmin
    .from("wa_agentes")
    .select("*")
    .eq("instancia", "agente-5541998803684")
    .maybeSingle();
    
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
    console.log("UNITID ENVIADO AO LIST_SLOTS =", args.salon_id || args.unitId);
    
    // Teste comparativo se tivermos data
    const targetUnitId = args.salon_id || args.unitId;
    const targetServiceId = args.service_id || args.serviceId || bookingContext.serviceId;
    
    if (args.date && targetServiceId) {
       console.log("\n--- TESTE COMPARATIVO BEMP ---");
       try {
         const venturaSlots = await BempService.listAvailableSlots({ 
            salonId: "1377", 
            serviceId: String(targetServiceId), 
            date: args.date 
         });
         const centroSlots = await BempService.listAvailableSlots({ 
            salonId: "1378", 
            serviceId: String(targetServiceId), 
            date: args.date 
         });
         
         console.log("SLOTS VENTURA (1377) =", venturaSlots.length);
         console.log("SLOTS CENTRO (1378) =", centroSlots.length);
         
         const juliaReply = traceData?.ai_response || "";
         console.log("HORÁRIOS OFERECIDOS PELA JULIA =", juliaReply);
         
         const isCentro = centroSlots.some((s: any) => juliaReply.includes(s.start.split('T')[1].substring(0, 5)));
         const isVentura = venturaSlots.some((s: any) => juliaReply.includes(s.start.split('T')[1].substring(0, 5)));
         
         console.log("HORÁRIOS ERAM DO CENTRO =", isCentro ? "SIM" : "NÃO");
         console.log("HORÁRIOS ERAM DO VENTURA =", isVentura ? "SIM" : "NÃO");
       } catch (e) {
         console.error("Erro no teste comparativo:", e);
       }
    }
  } else {
    console.log("AVAILABILITY_TOOL_CALLED = NÃO");
  }
}

diagnoseVenturaLeak().catch(console.error);
