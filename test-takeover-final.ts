import { runAgentFlow } from "./src/lib/evolution/agent.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function test() {
  const phone = "5541999102791";
  const instance = "julia-main";

  console.log("1. Preparando conversa expirada...");
  const expiredDate = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  
  // Primeiro garantimos que a conversa existe
  await supabaseAdmin.from("wa_conversas").upsert({ 
    phone, 
    instance,
    attendance_mode: "AI"
  }, { onConflict: 'phone' });

  // Agora forçamos o estado HUMAN
  const { error } = await supabaseAdmin.from("wa_conversas").update({ 
    attendance_mode: "HUMAN", 
    human_takeover_at: expiredDate 
  } as any).eq("phone", phone);

  if (error) console.error("Erro no setup:", error);

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
  console.log("Status final (DEVE SER AI):", (conv as any)?.attendance_mode);
}

test().catch(console.error);
