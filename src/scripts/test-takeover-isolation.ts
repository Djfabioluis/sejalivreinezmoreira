import { runAgentFlow } from "../lib/evolution/agent.server";

async function testIsolation() {
  console.log("--- TESTE DE ISOLAMENTO DE TAKEOVER ---");

  // Cliente A: MODO HUMAN
  const msgA = {
    messageId: "msg-a-" + Date.now(),
    instance: "agente-5541998430354",
    remoteJid: "5541900000001@s.whatsapp.net",
    pushName: "Cliente A (HUMAN)",
    message: { conversation: "Olá Julia" }, // MODO JÁ ESTÁ EM HUMAN NO BANCO DO TESTE ANTERIOR
    timestamp: Math.floor(Date.now() / 1000)
  };

  console.log("\n[1] Processando Cliente A - Já está em HUMAN, Julia deve silenciar...");
  await runAgentFlow(msgA as any);

  // Cliente B: MODO AI
  const msgB = {
    messageId: "msg-b-" + Date.now(),
    instance: "agente-5541998430354",
    remoteJid: "5541911111111@s.whatsapp.net",
    pushName: "Cliente B (AI)",
    message: { conversation: "Olá Julia, gostaria de agendar" },
    timestamp: Math.floor(Date.now() / 1000)
  };

  console.log("\n[2] Processando Cliente B - Mesma instância, modo AI, Julia deve responder...");
  await runAgentFlow(msgB as any);

  console.log("\n--- FIM DO TESTE ---");
}

testIsolation().catch(console.error);
