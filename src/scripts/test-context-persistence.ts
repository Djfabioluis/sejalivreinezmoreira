import { runAgentFlow } from "../lib/evolution/agent.server";
import { supabaseAdmin } from "../integrations/supabase/client.server";

async function testContextPersistence() {
  console.log("--- TESTE DE PERSISTÊNCIA DE CONTEXTO ---");

  const instanceId = "agente-5541998430354";
  const contactPhone = "5519988499999";
  const conversationKey = `${instanceId}:${contactPhone}`;

  console.log("[SETUP] Limpando dados de teste...");
  await supabaseAdmin
    .from("wa_conversas")
    .delete()
    .eq("phone", conversationKey);

  console.log("\n[TURNO 1] Cliente: Oi");
  await runAgentFlow({
    messageId: "t1-" + Date.now(),
    instance: instanceId,
    remoteJid: `${contactPhone}@s.whatsapp.net`,
    message: { conversation: "Oi" },
    timestamp: Math.floor(Date.now() / 1000)
  } as any);

  console.log("\n[TURNO 2] Cliente: Manicure");
  await runAgentFlow({
    messageId: "t2-" + Date.now(),
    instance: instanceId,
    remoteJid: `${contactPhone}@s.whatsapp.net`,
    message: { conversation: "Manicure" },
    timestamp: Math.floor(Date.now() / 1000)
  } as any);

  console.log("\n[TURNO 3] Cliente: 11/08");
  await runAgentFlow({
    messageId: "t3-" + Date.now(),
    instance: instanceId,
    remoteJid: `${contactPhone}@s.whatsapp.net`,
    message: { conversation: "11/08" },
    timestamp: Math.floor(Date.now() / 1000)
  } as any);

  // Verificação Final
  const { data: finalConv } = await supabaseAdmin
    .from("wa_conversas")
    .select("customer_context")
    .eq("phone", conversationKey)
    .maybeSingle();

  const customerContext = finalConv?.customer_context as any;
  const ctx = customerContext?.bookingContext;
  
  console.log("\n--- RESULTADO FINAL DO ESTADO ---");
  console.log("Service:", ctx?.serviceName);
  console.log("Date:", ctx?.date);
  
  const hasService = ctx?.serviceName === "Manicure";
  const hasDate = ctx?.date?.includes("-08-11");

  if (hasService && hasDate) {
    console.log("✅ SUCESSO: Contexto preservado corretamente!");
  } else {
    console.log("❌ FALHA: Contexto perdido ou incorreto.");
    console.log("Contexto atual:", JSON.stringify(ctx, null, 2));
  }
}

testContextPersistence().catch(console.error);
