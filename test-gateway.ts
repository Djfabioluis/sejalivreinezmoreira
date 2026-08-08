import { createLovableAiGatewayProvider } from "./src/lib/ai-gateway.server";
import { generateText } from "ai";

async function testSimpleGateway() {
  console.log("=== TESTE SIMPLES GATEWAY ===");
  const key = process.env.LOVABLE_API_KEY || "";
  console.log("Key length:", key.length);
  
  const provider = createLovableAiGatewayProvider(key);
  
  const models = [
    "google/gemini-1.5-flash",
    "openai/gpt-4o-mini",
    "anthropic/claude-3-5-haiku-latest"
  ];

  for (const modelId of models) {
    try {
      console.log(`Testando modelo: ${modelId}...`);
      const result = await generateText({
        model: provider(modelId),
        prompt: "Diga OK",
      });
      console.log(`Resultado ${modelId}:`, result.text);
      if (result.text) break;
    } catch (e: any) {
      console.error(`Erro ${modelId}:`, e.message);
    }
  }
}

testSimpleGateway();
