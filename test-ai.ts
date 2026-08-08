import { runAgent } from "./src/lib/chat.server";

async function testAI() {
  console.log("=== TESTE DIRETO DA IA JULIA (FIX) ===");
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
    
    if (result.text && result.text.toUpperCase().includes("OK")) {
      console.log("RESULTADO: SUCESSO");
    } else {
      console.log("RESULTADO: INESPERADO", JSON.stringify(result));
    }
  } catch (error: any) {
    console.error("AI_REQUEST_FAILED");
    console.error("Message:", error.message);
    if (error.data) console.error("Data:", JSON.stringify(error.data));
  }
}

testAI();
