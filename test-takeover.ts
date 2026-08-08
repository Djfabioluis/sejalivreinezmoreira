import { sendEvolutionText } from "./src/lib/evolution.server";
import { processMessagesUpsert } from "./src/lib/evolution/processor.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function test() {
  const phone = "5541999102791";
  const instance = "julia-main";

  console.log("1. Limpando dados antigos...");
  await supabaseAdmin.from("ai_sent_messages").delete().eq("phone", phone);
  await supabaseAdmin.from("wa_conversas").upsert({ 
    phone, 
    instance,
    attendance_mode: "AI", 
    human_takeover_at: null 
  }, { onConflict: 'phone' });

  console.log("2. Simulando persistência de ID da IA...");
  await supabaseAdmin.from("ai_sent_messages").insert({
    instance,
    message_id: "AI_MSG_123",
    phone,
    sent_at: new Date().toISOString()
  });

  console.log("3. Simulando Webhook de ECO da IA...");
  await processMessagesUpsert({
    instance,
    data: [
      {
        key: { remoteJid: phone + "@s.whatsapp.net", fromMe: true, id: "AI_MSG_123" },
        message: { conversation: "Olá cliente!" },
        messageTimestamp: Math.floor(Date.now() / 1000)
      }
    ]
  }, "http://localhost/webhook");

  let { data: conv } = await supabaseAdmin.from("wa_conversas").select("attendance_mode").eq("phone", phone).single();
  console.log("Status após ECO da IA:", conv?.attendance_mode, "(Esperado: AI)");

  console.log("4. Simulando Webhook de HUMANO...");
  await processMessagesUpsert({
    instance,
    data: [
      {
        key: { remoteJid: phone + "@s.whatsapp.net", fromMe: true, id: "HUMAN_MSG_456" },
        message: { conversation: "Olá, sou a atendente Julia Humana." },
        messageTimestamp: Math.floor(Date.now() / 1000)
      }
    ]
  }, "http://localhost/webhook");

  ({ data: conv } = await supabaseAdmin.from("wa_conversas").select("attendance_mode, human_takeover_at").eq("phone", phone).single());
  console.log("Status após HUMANO:", conv?.attendance_mode, "(Esperado: HUMAN)");

  console.log("5. Simulando entrada de cliente dentro da janela de 10min...");
  await processMessagesUpsert({
    instance,
    data: [
      {
        key: { remoteJid: phone + "@s.whatsapp.net", fromMe: false, id: "CLIENT_MSG_789" },
        message: { conversation: "Quero agendar!" },
        messageTimestamp: Math.floor(Date.now() / 1000)
      }
    ]
  }, "http://localhost/webhook");

  console.log("6. Simulando expiração...");
  const tenMinsAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
  await supabaseAdmin.from("wa_conversas").update({ 
    human_takeover_at: tenMinsAgo 
  }).eq("phone", phone);

  console.log("7. Simulando entrada de cliente APÓS 10min...");
  await processMessagesUpsert({
    instance,
    data: [
      {
        key: { remoteJid: phone + "@s.whatsapp.net", fromMe: false, id: "CLIENT_MSG_ABC" },
        message: { conversation: "Oi?" },
        messageTimestamp: Math.floor(Date.now() / 1000)
      }
    ]
  }, "http://localhost/webhook");

  ({ data: conv } = await supabaseAdmin.from("wa_conversas").select("attendance_mode").eq("phone", phone).single());
  console.log("Status final:", conv?.attendance_mode, "(Esperado: AI)");
}

test().catch(console.error);
