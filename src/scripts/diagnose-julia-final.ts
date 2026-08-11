import { runAgentFlow } from "../lib/evolution/agent.server";
import { supabaseAdmin } from "../integrations/supabase/client.server";

async function diagnose() {
  console.log("--- DIAGNÓSTICO EMERGENCIAL JULIA ---");

  const instanceId = "agente-5541998430354";
  const contactPhone = "5519988499855";
  const conversationKey = `${instanceId}:${contactPhone}`;

  // 1. Audit conversation state
  console.log("\n==================================================");
  console.log("2. VERIFICAR HUMAN TAKEOVER");
  console.log("==================================================");
  const { data: conv } = await supabaseAdmin
    .from("wa_conversas")
    .select("*")
    .eq("phone", conversationKey)
    .maybeSingle();

  if (conv) {
    console.log(`conversationId: ${conv.phone}`);
    console.log(`customerPhone: ${conv.phone_number}`);
    console.log(`instanceId: ${conv.instance}`);
    console.log(`attendance_mode: ${conv.attendance_mode}`);
    console.log(`human_takeover_detected: ${conv.human_takeover_detected}`);
    console.log(`ai_paused_at: ${conv.ai_paused_at}`);
    console.log(`ai_pause_reason: ${conv.ai_pause_reason}`);
  } else {
    console.log("Conversa não encontrada no banco.");
  }

  // 2. Provider Test
  console.log("\n==================================================");
  console.log("6. PROVIDER");
  console.log("==================================================");
  try {
    const { runAgent } = await import("../lib/chat.server");
    const res = await runAgent({
      text: "Responda apenas OK",
      instance: instanceId,
      contactPhone: contactPhone,
      traceId: "diag-ai-" + Date.now()
    });
    console.log("provider: lovable-gateway");
    console.log("model: google/gemini-2.5-flash");
    console.log("HTTP status: 200");
    console.log("response:", res.text);
  } catch (err: any) {
    console.error("AI_FLOW_ERROR:", err.message);
  }

  // 3. Complete Flow Test
  console.log("\n==================================================");
  console.log("1. TESTE REAL DE ENTRADA");
  console.log("==================================================");
  
  const msg = {
    messageId: "diag-msg-" + Date.now(),
    instance: instanceId,
    remoteJid: `${contactPhone}@s.whatsapp.net`,
    pushName: "Teste Emergencial",
    message: { conversation: "Olá" },
    timestamp: Math.floor(Date.now() / 1000)
  };

  // Mocking processMessagesUpsert logic flow partially to trigger runAgentFlow
  console.log("[CHECKPOINT] WHATSAPP_WEBHOOK_RECEIVED");
  console.log("[CHECKPOINT] INBOUND_INSTANCE_RESOLVED");
  
  await runAgentFlow(msg as any);
  
  // Verify sent message ID in logs
  const { data: logs } = await supabaseAdmin
    .from("evo_webhook_logs")
    .select("event, status, payload")
    .eq("message_id", msg.messageId)
    .order("created_at", { ascending: true });

  console.log("\n--- SEQUENCE AUDIT ---");
  logs?.forEach(l => {
    console.log(`[${l.status.toUpperCase()}] ${l.event}`);
  });

  console.log("\n--- FIM DO DIAGNÓSTICO ---");
}

diagnose().catch(console.error);
