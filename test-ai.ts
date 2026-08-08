import { runAgent } from "./src/lib/chat.server";
import { logger } from "./src/lib/observability/logger.server";

async function testAI() {
  console.log("=== TESTE DIRETO DA IA JULIA ===");
  try {
    const opts = {
      messages: [{ role: "user", content: "Responda apenas OK" }],
      contactName: "Tester",
      contactPhone: "5541999999999",
      traceId: "test-direct-ai-" + Date.now(),
      sandbox: true
    };

    console.log("Chamando runAgent...");
    const result = await runAgent(opts as any);
    console.log("AI_RESPONSE_RECEIVED:", result.text);
    
    if (result.text.includes("OK")) {
      console.log("RESULTADO: SUCESSO");
    } else {
      console.log("RESULTADO: INESPERADO (Texto recebido mas não é OK)");
    }
  } catch (error: any) {
    console.error("AI_REQUEST_FAILED");
    console.error("Status:", error.status);
    console.error("Message:", error.message);
    if (error.data) console.error("Body:", JSON.stringify(error.data));
    console.error("Stack:", error.stack);
  }
}

testAI();
