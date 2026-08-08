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

  console.log("2. Simulando ECO da IA...");
  await supabaseAdmin.from("ai_sent_messages").insert({
    instance,
    message_id: "AI_MSG_1",
    phone,
    sent_at: new Date().toISOString()
  });
  await processMessagesUpsert({
    instance,
    data: [{
      key: { remoteJid: phone + "@s.whatsapp.net", fromMe: true, id: "AI_MSG_1" },
      message: { conversation: "Olá!" },
      messageTimestamp: Math.floor(Date.now() / 1000)
    }]
  }, "http://localhost/webhook");
  let { data: conv } = await supabaseAdmin.from("wa_conversas").select("attendance_mode").eq("phone", phone).single();
  console.log("Status ECO IA:", (conv as any)?.attendance_mode);

  console.log("3. Simulando HUMANO...");
  await processMessagesUpsert({
    instance,
    data: [{
      key: { remoteJid: phone + "@s.whatsapp.net", fromMe: true, id: "HUMAN_MSG_2" },
      message: { conversation: "Eu assumo aqui." },
      messageTimestamp: Math.floor(Date.now() / 1000)
    }]
  }, "http://localhost/webhook");
  ({ data: conv } = await supabaseAdmin.from("wa_conversas").select("attendance_mode, human_takeover_at").eq("phone", phone).single());
  console.log("Status HUMANO:", (conv as any)?.attendance_mode, "| Takeover at:", (conv as any)?.human_takeover_at);

  console.log("4. Verificando processamento de cliente APÓS expiração forçada...");
  // Tentamos o RPC de forma segura
  try {
      await (supabaseAdmin as any).rpc("execute_sql", {
          sql: `UPDATE public.wa_conversas SET human_takeover_at = now() - interval '15 minutes' WHERE phone = '${phone}'`
      });
  } catch (e) {
      const expirationDate = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      await supabaseAdmin.from("wa_conversas").update({ human_takeover_at: expirationDate } as any).eq("phone", phone);
  }

  console.log("Executando webhook de cliente...");
  await processMessagesUpsert({
    instance,
    data: [{
      key: { remoteJid: phone + "@s.whatsapp.net", fromMe: false, id: "CLIENT_MSG_3" },
      message: { conversation: "Oi!" },
      messageTimestamp: Math.floor(Date.now() / 1000)
    }]
  }, "http://localhost/webhook");

  await new Promise(r => setTimeout(r, 1000));
  ({ data: conv } = await supabaseAdmin.from("wa_conversas").select("attendance_mode").eq("phone", phone).single());
  console.log("Status final:", (conv as any)?.attendance_mode);
}

test().catch(console.error);
