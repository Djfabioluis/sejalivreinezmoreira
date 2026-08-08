import { runAgentFlow } from "./src/lib/evolution/agent.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function test() {
  const phone = "5541999102791";
  const instance = "julia-main";

  console.log("1. Preparando conversa expirada...");
  const expiredDate = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  
  // Limpa tudo antes
  await supabaseAdmin.from("wa_conversas").delete().eq("phone", phone);

  // Insere direto com o estado desejado usando supabaseAdmin puro (sem casting as any excessivo)
  const { data: inserted, error: setupError } = await supabaseAdmin
    .from("wa_conversas")
    .insert({ 
      phone, 
      instance,
      attendance_mode: "HUMAN", 
      human_takeover_at: expiredDate 
    })
    .select()
    .single();

  if (setupError) {
      console.error("Erro no setup:", setupError);
      return;
  }
  console.log("Setup inicial:", inserted.attendance_mode, inserted.human_takeover_at);

  console.log("2. Chamando runAgentFlow DIRETAMENTE...");
  await runAgentFlow({
      instance,
      messageId: "DIRECT_TEST_" + Date.now(),
      remoteJid: phone + "@s.whatsapp.net",
      fromMe: false,
      pushName: "Test User",
      message: { conversation: "Oi!" },
      messageTimestamp: Math.floor(Date.now() / 1000)
  });

  console.log("3. Verificando resultado...");
  const { data: conv } = await supabaseAdmin.from("wa_conversas").select("attendance_mode").eq("phone", phone).single();
  console.log("Status final (DEVE SER AI):", conv?.attendance_mode);
}

test().catch(console.error);
