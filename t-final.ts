
import { runAgentFlow } from "./src/lib/evolution/agent.server";

async function testFinal() {
  const traceId = `final-test-${Date.now()}`;
  console.log(`[TEST] Starting Final Integration Test. traceId: ${traceId}`);

  // Mock NormalizedEvolutionMessage
  const msg = {
    messageId: `test-msg-${Date.now()}`,
    instance: "agente-5541998430354",
    remoteJid: "5541998430354@s.whatsapp.net",
    fromMe: false,
    pushName: "Inez Test",
    timestamp: Math.floor(Date.now() / 1000),
    message: { conversation: "Olá" },
    _traceId: traceId
  };

  try {
    await runAgentFlow(msg as any, "Olá");
    console.log("[TEST] runAgentFlow finished. Check logs for checkpoints.");
  } catch (error) {
    console.error("[TEST] ❌ FATAL TEST ERROR:", error);
  }
}

testFinal();
