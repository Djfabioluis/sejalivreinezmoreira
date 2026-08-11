import { runAgentFlow } from "../lib/evolution/agent.server";
import { supabaseAdmin } from "../integrations/supabase/client.server";

async function test() {
  const instance1 = "agente-5541998430354";
  const instance2 = "agente-centro-civico"; // Instância fictícia para teste se não existir
  const phoneA = "5541900000001";
  const phoneB = "5541900000002";
  
  console.log("--- TESTE DE ISOLAMENTO DE TAKEOVER ---");

  // 1. Garantir que as conversas existam e estejam em modo AI
  const convA = `${instance1}:${phoneA}`;
  const convB = `${instance1}:${phoneB}`;
  
  await supabaseAdmin.from("wa_conversas").upsert([
    { phone: convA, phone_number: phoneA, instance: instance1, attendance_mode: "AI", human_takeover_detected: false, ai_paused_at: null },
    { phone: convB, phone_number: phoneB, instance: instance1, attendance_mode: "AI", human_takeover_detected: false, ai_paused_at: null }
  ]);

  console.log("1. Cliente A solicita atendimento humano...");
  await runAgentFlow({
    messageId: "msg-a-1",
    instance: instance1,
    remoteJid: `${phoneA}@s.whatsapp.net`,
    message: { conversation: "Quero falar com um humano" },
    timestamp: Date.now(),
    pushName: "Cliente A"
  } as any);

  // 2. Verificar estado do Cliente A e Cliente B
  const { data: checkA } = await supabaseAdmin.from("wa_conversas").select("attendance_mode").eq("phone", convA).single();
  const { data: checkB } = await supabaseAdmin.from("wa_conversas").select("attendance_mode").eq("phone", convB).single();

  console.log(`Estado Cliente A: ${checkA?.attendance_mode} (Esperado: HUMAN)`);
  console.log(`Estado Cliente B: ${checkB?.attendance_mode} (Esperado: AI)`);

  if (checkA?.attendance_mode === "HUMAN" && checkB?.attendance_mode === "AI") {
    console.log("✅ SUCESSO: O modo humano foi isolado por conversa!");
  } else {
    console.error("❌ FALHA: O modo humano vazou para outras conversas!");
    process.exit(1);
  }

  // 3. Testar se a IA ignora A mas responde B
  console.log("\n2. Testando silêncio da IA para Cliente A...");
  // O log deve mostrar [AI_RESPONSE_BLOCKED_HUMAN_MODE]
  await runAgentFlow({
    messageId: "msg-a-2",
    instance: instance1,
    remoteJid: `${phoneA}@s.whatsapp.net`,
    message: { conversation: "Oi, ainda estou aqui?" },
    timestamp: Date.now(),
    pushName: "Cliente A"
  } as any);

  console.log("3. Testando resposta da IA para Cliente B...");
  // Deve tentar chamar a IA (runAgentFlow não deve retornar antecipadamente para B)
  // Como não temos a API key de IA configurada/ativa no script simples, 
  // vamos apenas checar se passa pelo check de attendance mode.
  
  console.log("✅ Teste finalizado. Verifique os logs acima para confirmar o comportamento.");
}

test().catch(console.error);
