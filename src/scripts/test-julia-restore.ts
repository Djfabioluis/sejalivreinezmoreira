import { runAgentFlow } from "../lib/evolution/agent.server";
import { supabaseAdmin } from "../integrations/supabase/client.server";

async function testRestore() {
  console.log("--- TESTE REAL DE ENTRADA (SIMULAÇÃO) ---");
  
  const instanceId = "agente-5541998430354";
  const contactPhone = "5519988499855";
  const conversationKey = `${instanceId}:${contactPhone}`;

  // 1. Audit conversation state
  const { data: conv } = await supabaseAdmin
    .from("wa_conversas")
    .select("*")
    .eq("phone", conversationKey)
    .single();
    
  console.log("==================================================");
  console.log("2. VERIFICAR HUMAN TAKEOVER");
  console.log("==================================================");
  if (conv) {
    console.log(`conversationId: ${conv.phone}`);
    console.log(`customerPhone: ${conv.phone_number}`);
    console.log(`instanceId: ${conv.instance}`);
    console.log(`attendance_mode: ${conv.attendance_mode}`);
    console.log(`human_takeover_detected: ${conv.human_takeover_detected}`);
    console.log(`ai_paused_at: ${conv.ai_paused_at}`);
    console.log(`ai_pause_reason: ${conv.ai_pause_reason}`);
  } else {
    console.log("Conversa de teste não encontrada.");
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
      traceId: "test-provider-" + Date.now()
    });
    console.log(`provider: lovable-gateway`);
    console.log(`model: google/gemini-2.5-flash`);
    console.log(`response: ${res.text}`);
  } catch (err: any) {
    console.error("Erro no provider:", err.message);
  }

  // 3. Complete Flow Test
  console.log("\n==================================================");
  console.log("1. TESTE REAL DE ENTRADA");
  console.log("==================================================");
  const msg = {
    messageId: "msg-test-" + Date.now(),
    instance: instanceId,
    remoteJid: `${contactPhone}@s.whatsapp.net`,
    pushName: "Teste Recuperacao",
    message: { conversation: "Olá teste recuperação" },
    timestamp: Math.floor(Date.now() / 1000)
  };

  await runAgentFlow(msg as any);
  console.log("\n--- FIM DO TESTE ---");
}

testRestore().catch(console.error);
