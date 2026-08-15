import { supabaseAdmin } from "../../../integrations/supabase/client.server";
import { BempService } from "../../bemp-service.server";

async function diagnoseVenturaLeak() {
  console.log("=== INICIANDO DIAGNÓSTICO FORENSE VENTURA ===");

  // 1. Localizar logs na evo_webhook_logs que contêm chamadas de list_slots
  const { data: logs, error: logError } = await supabaseAdmin
    .from('evo_webhook_logs' as any)
    .select('*')
    .eq('instance', 'agente-5541998803684')
    .order('timestamp', { ascending: false })
    .limit(100);

  if (logError || !logs || logs.length === 0) {
    console.log("CASO REAL VENTURA ENCONTRADO = NÃO (Sem logs na evo_webhook_logs)");
    return;
  }

  // Procurar por chamadas de ferramenta list_slots
  const slotLog = logs.find((l: any) => {
    try {
      const p = typeof l.payload === 'string' ? JSON.parse(l.payload) : l.payload;
      // O logEvent é chamado com payload: { traceId, tool, ... } ou similar
      return p?.tool === 'list_slots' || (l.event === 'AI_STEP_COMPLETED' && p?.toolCalls?.some((tc: any) => tc.function.name === 'list_slots'));
    } catch { return false; }
  });

  if (!slotLog) {
     console.log("AVAILABILITY_TOOL_CALLED = NÃO ENCONTRADO NOS LOGS RECENTES");
     // Vamos pegar o mais recente para auditoria básica
     const latest = logs[0];
     console.log("Último evento Ventura:", latest.event, "em", latest.timestamp);
     return;
  }

  const p = typeof slotLog.payload === 'string' ? JSON.parse(slotLog.payload) : slotLog.payload;
  console.log("CASO REAL VENTURA ENCONTRADO = SIM");
  console.log("timestamp =", slotLog.timestamp);
  console.log("event =", slotLog.event);

  // 2. Verificar resolução de unidade
  const { data: agent } = await supabaseAdmin
    .from("wa_agentes")
    .select("*")
    .eq("instancia", "agente-5541998803684")
    .maybeSingle();
    
  console.log("unitId obtido de wa_agentes =", agent?.unidade_id);

  // 3. Auditar a chamada
  // Dependendo de como o log é estruturado, os argumentos podem estar em locais diferentes
  const toolCall = p?.toolCalls?.find((tc: any) => tc.function.name === 'list_slots');
  const args = toolCall ? JSON.parse(toolCall.function.arguments) : (p?.args || {});
  
  console.log("UNITID ENVIADO AO LIST_SLOTS =", args.salon_id || args.unitId);

  // 4. Teste comparativo BEMP
  const targetServiceId = args.service_id || args.serviceId;
  const date = args.date;

  if (date && targetServiceId) {
    console.log("\n--- TESTE COMPARATIVO BEMP ---");
    console.log("Serviço:", targetServiceId, "Data:", date);
    try {
      const venturaSlots = await BempService.listAvailableSlots({ 
        salonId: "1377", 
        serviceId: String(targetServiceId), 
        date 
      });
      const centroSlots = await BempService.listAvailableSlots({ 
        salonId: "1378", 
        serviceId: String(targetServiceId), 
        date 
      });
      
      console.log("SLOTS VENTURA (1377) =", venturaSlots.length);
      console.log("SLOTS CENTRO (1378) =", centroSlots.length);
      
      // Se tivermos a resposta da IA no log
      const aiResponse = p?.aiResponse || p?.text || "";
      if (aiResponse) {
        console.log("HORÁRIOS OFERECIDOS PELA JULIA =", aiResponse);
        const isCentro = centroSlots.some((s: any) => aiResponse.includes(s.start.split('T')[1].substring(0, 5)));
        const isVentura = venturaSlots.some((s: any) => aiResponse.includes(s.start.split('T')[1].substring(0, 5)));
        console.log("HORÁRIOS ERAM DO CENTRO =", isCentro ? "SIM" : "NÃO");
        console.log("HORÁRIOS ERAM DO VENTURA =", isVentura ? "SIM" : "NÃO");
      }
    } catch (e) {
      console.error("Erro no BempService:", e);
    }
  }
}

diagnoseVenturaLeak().catch(console.error);
