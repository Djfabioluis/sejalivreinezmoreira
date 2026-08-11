import { runAgentFlow } from "../lib/evolution/agent.server";

async function testIsolation() {
  console.log("--- TESTE DE ISOLAMENTO DE TAKEOVER ---");

  // Simular Cliente A (HUMAN)
  const msgA = {
    messageId: "msg-a-1",
    instance: "agente-5541998430354",
    remoteJid: "5541900000001@s.whatsapp.net",
    pushName: "Cliente A (HUMAN)",
    message: { conversation: "Quero falar com um humano" },
    timestamp: Math.floor(Date.now() / 1000)
  };

  console.log("\n[1] Processando Cliente A - Pedido de Humano...");
  await runAgentFlow(msgA as any);

  // Simular Cliente B (AI na mesma instância)
  const msgB = {
    messageId: "msg-b-1",
    instance: "agente-5541998430354",
    remoteJid: "5541911111111@s.whatsapp.net",
    pushName: "Cliente B (AI)",
    message: { conversation: "Olá, gostaria de agendar" },
    timestamp: Math.floor(Date.now() / 1000)
  };

  console.log("\n[2] Processando Cliente B - Mesma instância, modo AI...");
  await runAgentFlow(msgB as any);

  console.log("\n--- FIM DO TESTE ---");
}

testIsolation().catch(console.error);
