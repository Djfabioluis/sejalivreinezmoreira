import { processMessagesUpsert } from '../lib/evolution/processor.server';
import { supabaseAdmin } from '../integrations/supabase/client.server';

async function test() {
  const instance = "agente-5541998430354"; // Unidade 1377
  const phone = "554199102791";
  const remoteJid = `${phone}@s.whatsapp.net`;
  const conversationKey = `${instance}:${phone}`;

  console.log("--- TESTE A: Cliente em HUMAN (Silêncio esperado) ---");
  await supabaseAdmin.from('wa_conversas').update({ 
    attendance_mode: 'HUMAN',
    human_takeover_detected: true,
    ai_paused_at: new Date().toISOString()
  }).eq('phone', conversationKey);

  const payloadA = {
    instance,
    event: "messages.upsert",
    data: {
      key: { remoteJid, fromMe: false, id: "TEST-A-" + Date.now() },
      message: { conversation: "Olá Julia, teste HUMAN" },
      pushName: "Teste Human"
    },
    _traceId: "trace-test-human-" + Date.now()
  };
  await processMessagesUpsert(payloadA, "http://localhost:8080");

  console.log("\n--- TESTE B: Cliente em AI (Resposta esperada) ---");
  await supabaseAdmin.from('wa_conversas').update({ 
    attendance_mode: 'AI',
    human_takeover_detected: false,
    ai_paused_at: null,
    ai_pause_reason: null
  }).eq('phone', conversationKey);

  const payloadB = {
    instance,
    event: "messages.upsert",
    data: {
      key: { remoteJid, fromMe: false, id: "TEST-B-" + Date.now() },
      message: { conversation: "Olá" },
      pushName: "Teste AI"
    },
    _traceId: "trace-test-ai-" + Date.now()
  };
  await processMessagesUpsert(payloadB, "http://localhost:8080");

  console.log("\nTestes disparados. Verifique os logs do banco para WHATSAPP_WEBHOOK_RECEIVED e MESSAGE_SENT.");
}

test().catch(console.error);
