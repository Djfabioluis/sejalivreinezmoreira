
import { runAgentWithLogging } from "./src/lib/chat.server";
import { logger } from "./src/lib/observability/logger.server";
import { normalizeConversationHistory } from "./src/lib/evolution/history";

async function testOrchestrator() {
  const traceId = `test-orch-${Date.now()}`;
  console.log(`[TEST] Starting Orchestrator Test. traceId: ${traceId}`);
  
  const rawHistory = [
    { role: "user", parts: [{ type: "text", text: "Oi" }], id: "msg-1" },
    { role: "assistant", parts: [{ type: "text", text: "Olá! Como posso ajudar?" }], id: "msg-2" }
  ];
  const history = normalizeConversationHistory(rawHistory, "Tudo bem?");

  const start = Date.now();
  try {
    const result = await runAgentWithLogging({
      messages: history,
      text: "Tudo bem?",
      instance: "test-instance",
      messageId: "test-msg-orch",
      contactPhone: "5511999999999",
      conversationKey: "test-conv-key",
      traceId,
      unidadeId: "1", // Simulando unidade
      contactName: "Inez"
    } as any);
    
    const duration = Date.now() - start;
    console.log(`[TEST] Result received in ${duration}ms`);
    console.log(`[TEST] AI Response: "${result.text}"`);
    
    if (result.text && result.text.length > 5) {
      console.log("[TEST] ✅ SUCCESS: Orchestrator returned valid text");
    } else {
      console.log("[TEST] ❌ FAILED: Orchestrator returned empty or invalid text");
    }
  } catch (error: any) {
    console.error("[TEST] ❌ ORCHESTRATOR ERROR");
    console.error(`Name: ${error.name}`);
    console.error(`Message: ${error.message}`);
    // console.error(error.stack);
  }
}

testOrchestrator();
