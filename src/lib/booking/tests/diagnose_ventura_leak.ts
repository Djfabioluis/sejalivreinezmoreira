import { supabaseAdmin } from "../../../integrations/supabase/client.server";
import { BempService } from "../../bemp-service.server";

async function diagnoseVenturaLeak() {
  console.log("=== INICIANDO DIAGNÓSTICO FORENSE VENTURA ===");

  const { data: traces, error: traceError } = await (supabaseAdmin.from('evo_trace_logs' as any).select('*') as any)
    .eq('instance_id', 'agente-5541998803684')
    .ilike('payload::text', '%list_slots%')
    .order('timestamp', { ascending: false })
    .limit(10);

  if (traceError || !traces || traces.length === 0) {
    const { data: backupLogs } = await (supabaseAdmin.from('evo_webhook_logs' as any).select('*') as any)
      .eq('instance', 'agente-5541998803684')
      .ilike('payload::text', '%list_slots%')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (!backupLogs || backupLogs.length === 0) {
      console.log("CASO REAL VENTURA ENCONTRADO = NÃO (Sem traces de list_slots encontrados)");
      return;
    }
    
    const log = backupLogs[0];
    const p = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
    console.log("CASO REAL VENTURA ENCONTRADO = SIM (via webhook_logs)");
    await performAudit(log.instance, log.message_id, p, log.created_at);
    return;
  }

  const trace = traces[0];
  console.log("CASO REAL VENTURA ENCONTRADO = SIM");
  await performAudit(trace.instance_id, trace.conversation_id, trace.payload, trace.timestamp);
}

async function performAudit(instanceId: string, convOrMsgId: string, payload: any, timestamp: string) {
  console.log("INSTANCE INBOUND =", instanceId);
  console.log("timestamp =", timestamp);
  
  const { data: agent } = await (supabaseAdmin.from("wa_agentes").select("unidade_id").eq("instancia", instanceId).maybeSingle() as any);
  console.log("UNITID INBOUND =", agent?.unidade_id);

  let args: any = {};
  if (payload?.tool === 'list_slots') {
    args = payload.args || {};
  } else if (Array.isArray(payload?.toolCalls)) {
    const tc = payload.toolCalls.find((c: any) => c.function.name === 'list_slots');
    if (tc) args = JSON.parse(tc.function.arguments);
  }
  
  const sentUnitId = args.salon_id || args.unitId;
  console.log("UNITID ENVIADO AO LIST_SLOTS =", sentUnitId);

  if (convOrMsgId) {
    // Tentar buscar por id ou message_id
    const { data: conv } = await (supabaseAdmin.from("wa_conversas").select("customer_context").or(`id.eq."${convOrMsgId}",phone.eq."${convOrMsgId}"`).maybeSingle() as any);
    const bc = conv?.customer_context?.bookingContext;
    console.log("BOOKINGCONTEXT UNITID =", bc?.unitId);
  }

  const serviceId = args.service_id || args.serviceId;
  const date = args.date;
  if (date && serviceId) {
    console.log("\n--- TESTE COMPARATIVO BEMP ---");
    const vSlots = await BempService.listAvailableSlots({ salonId: "1377", serviceId: String(serviceId), date });
    const cSlots = await BempService.listAvailableSlots({ salonId: "1378", serviceId: String(serviceId), date });
    console.log("SLOTS VENTURA (1377) =", vSlots.length);
    console.log("SLOTS CENTRO (1378) =", cSlots.length);
    
    const aiText = payload?.aiResponse || payload?.text || "";
    if (aiText) {
      console.log("HORÁRIOS OFERECIDOS PELA JULIA =", aiText);
      const isC = cSlots.some((s: any) => aiText.includes(s.start.split('T')[1].substring(0, 5)));
      console.log("HORÁRIOS ERAM DO CENTRO =", isC ? "SIM" : "NÃO");
    }
  }
}

diagnoseVenturaLeak().catch(console.error);
