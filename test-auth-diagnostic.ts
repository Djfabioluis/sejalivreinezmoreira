import { authenticateWebhook } from "./src/lib/evolution/auth.server";
import { getEvolutionConfig } from "./src/lib/evolution.server";

async function run() {
  const config = await getEvolutionConfig();
  console.log("CONFIG:", JSON.stringify(config, null, 2));

  const mockRequest = new Request("http://localhost:8080/api/public/whatsapp-evolution", {
    headers: {
      "apikey": config.apiKey || "MISSING"
    }
  });

  const result = await authenticateWebhook(mockRequest);
  console.log("AUTH RESULT (with apikey):", JSON.stringify(result, null, 2));
}

run().catch(console.error);
