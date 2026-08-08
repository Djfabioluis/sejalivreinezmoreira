
import { runAgentWithLogging } from "./src/lib/chat.server";
import { logger } from "./src/lib/observability/logger.server";

async function testProvider() {
  const traceId = `test-provider-${Date.now()}`;
  console.log(`[TEST] Starting Provider Test. traceId: ${traceId}`);
  
  const start = Date.now();
  try {
    const result = await runAgentWithLogging({
      messages: [{ role: "user", parts: [{ type: "text", text: "Responda apenas OK" }] }],
      text: "Responda apenas OK",
      instance: "test-instance",
      messageId: "test-msg-id",
      contactPhone: "5511999999999",
      conversationKey: "test-conv-key",
      traceId
    } as any);
    
    const duration = Date.now() - start;
    console.log(`[TEST] Result received in ${duration}ms`);
    console.log(`[TEST] Response: "${result.text}"`);
    
    if (result.text?.trim().toUpperCase() === "OK") {
      console.log("[TEST] ✅ SUCCESS: Provider returned OK");
    } else {
      console.log("[TEST] ❌ FAILED: Provider did not return OK");
    }
  } catch (error: any) {
    console.error("[TEST] ❌ PROVIDER ERROR");
    console.error(`Name: ${error.name}`);
    console.error(`Message: ${error.message}`);
    if (error.status) console.error(`Status: ${error.status}`);
    if (error.data) console.error(`Data: ${JSON.stringify(error.data)}`);
    // console.error(error.stack);
  }
}

testProvider();
