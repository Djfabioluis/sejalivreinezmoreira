import { runAgent } from "../../chat.server";
import { BookingContext, detectSubscriptionIntent } from "../context";

export async function runAuditTest() {
  console.log("--- INICIANDO AUDITORIA FORENSE ---");
  
  const text = "quero fazer mão hoje";
  const mockMessages = undefined as any; // Provocando o erro
  
  console.log("TEST_FILE = src/lib/booking/tests/persistence-pipeline.functions.ts");
  console.log("MOCK_FILE = src/lib/booking/tests/persistence-pipeline.functions.ts");
  console.log("FUNÇÃO_DO_TESTE = testPersistencePipeline");
  
  console.log("--- CHAMADA runAgent ---");
  const opts = {
    text: text,
    messages: mockMessages,
    conversationKey: "5541999999999",
    unidadeId: "5258",
    sandbox: true,
    customerContext: {}
  };
  
  console.log("runAgent arguments:");
  console.log("pos=0, name=opts, type=AgentOptions & { messages?: any[]; text?: string }, value=", JSON.stringify(opts));
  
  console.log("--- INVESTIGANDO PARAMETRO messages EM runAgent ---");
  // Simular o que acontece no início de runAgent
  const rawMessages = Array.isArray(opts.messages) ? opts.messages : [];
  console.log("typeof opts.messages =", typeof opts.messages);
  console.log("Array.isArray(opts.messages) =", Array.isArray(opts.messages));
  
  console.log("--- INVESTIGANDO detectSubscriptionIntent ---");
  console.log("detectSubscriptionIntent signature: (text: string | null | undefined) => boolean");
  console.log("Calling detectSubscriptionIntent(text) with text =", text);
  
  try {
    const intent = detectSubscriptionIntent(text);
    console.log("detectSubscriptionIntent result =", intent);
  } catch (e: any) {
    console.log("detectSubscriptionIntent CRASHED:", e.message);
  }

  console.log("--- EXECUTANDO runAgent REAL ---");
  try {
    await runAgent(opts as any);
  } catch (e: any) {
    console.log("runAgent CRASHED:", e.message);
    if (e.stack) {
       console.log("STACK:", e.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
}
