import { supabaseAdmin } from "../../../integrations/supabase/client.server";
import { BempService } from "../../bemp-service.server";

async function diagnoseVenturaLeak() {
  console.log("=== INICIANDO DIAGNÓSTICO FORENSE VENTURA ===");

  const { data: logs, error: logError } = await (supabaseAdmin.from('evo_webhook_logs' as any).select('*') as any)
    .eq('instance', 'agente-5541998803684')
    .order('created_at', { ascending: false })
    .limit(200);

  if (logError || !logs || logs.length === 0) {
    console.log("CASO REAL VENTURA ENCONTRADO = NÃO (Sem logs na evo_webhook_logs)");
    return;
  }

  const slotLog = logs.find((l: any) => l.payload && String(l.payload).includes('list_slots'));

  if (!slotLog) {
     console.log("AVAILABILITY_TOOL_CALLED = NÃO ENCONTRADO NOS LOGS RECENTES (Últimos 200)");
     return;
  }

  const p = typeof slotLog.payload === 'string' ? JSON.parse(slotLog.payload) : slotLog.payload;
  console.log("CASO REAL VENTURA ENCONTRADO = SIM");
  console.log("created_at =", slotLog.created_at);

  const { data: agent } = await (supabaseAdmin.from("wa_agentes").select("*").eq("instancia", "agente-5541998803684").maybeSingle() as any);
  console.log("unitId obtido de wa_agentes =", agent?.unidade_id);

  let args: any = {};
  if (p?.tool === 'list_slots') args = p.args || {};
  else if (Array.isArray(p?.toolCalls)) {
    const tc = p.toolCalls.find((c: any) => c.function.name === 'list_slots');
    if (tc) args = JSON.parse(tc.function.arguments);
  }
  
  const sentUnitId = args.salon_id || args.unitId;
  console.log("UNITID ENVIADO AO LIST_SLOTS =", sentUnitId);

  const targetServiceId = args.service_id || args.serviceId;
  const date = args.date;

  if (date && targetServiceId) {
    console.log("\n--- TESTE COMPARATIVO BEMP ---");
    const venturaSlots = await BempService.listAvailableSlots({ salonId: "1377", serviceId: String(targetServiceId), date });
    const centroSlots = await BempService.listAvailableSlots({ salonId: "1378", serviceId: String(targetServiceId), date });
    
    console.log("SLOTS VENTURA (1377) =", venturaSlots.length);
    console.log("SLOTS CENTRO (1378) =", centroSlots.length);
    
    const aiResponse = p?.aiResponse || p?.text || (p?.data?.message?.conversation) || "";
    if (aiResponse) {
      console.log("HORÁRIOS OFERECIDOS PELA JULIA =", aiResponse);
      const isCentro = centroSlots.some((s: any) => aiResponse.includes(s.start.split('T')[1].substring(0, 5)));
      console.log("HORÁRIOS ERAM DO CENTRO =", isCentro ? "SIM" : "NÃO");
    }
  }
}

diagnoseVenturaLeak().catch(console.error);
