import { replyWithAI } from "./src/lib/evolution/reply.server";
import { PerformanceTrace } from "./src/lib/evolution/performance.server";

async function runTests() {
  const mockTrace = new PerformanceTrace({
    traceId: "test-auditoria-" + Date.now(),
    instanceId: "BOULEVARD",
    conversationId: "5541999999999"
  });

  console.log("--- TESTE 1: Bloqueio de Preço Inventado ---");
  try {
    // Julia tenta inventar R$ 79,90 mas o BEMP diz R$ 100,00
    await replyWithAI({
      instance: "BOULEVARD",
      phone: "5541999999999",
      text: "O valor do corte é R$ 79,90. 💜",
      conversationKey: "5541999999999",
      resolvedPrice: {
        serviceId: "18645",
        serviceName: "CORTE FEMININO",
        price: 100.00,
        unitId: "5258",
        source: "BEMP"
      },
      _trace: mockTrace
    }, mockTrace.traceId);
  } catch (e) {
    console.log("Capturado esperado:", e.message);
  }

  console.log("\n--- TESTE 2: Fallback quando não há cotação ---");
  // Julia tenta falar preço mas a ferramenta não foi chamada
  await replyWithAI({
    instance: "BOULEVARD",
    phone: "5541999999999",
    text: "O corte custa R$ 79,90.",
    conversationKey: "5541999999999",
    resolvedPrice: null,
    _trace: mockTrace
  }, mockTrace.traceId);
}

runTests().catch(console.error);
