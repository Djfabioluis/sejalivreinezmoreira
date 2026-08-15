import { supabaseAdmin } from "../../../integrations/supabase/client.server";
import { runAgent } from "../../chat.server";
import { extractBookingSlots, mergeBookingContext } from "../context";

async function test_flow(label: string, scenario: { messages: any[], unitId: string, description: string }) {
  console.log(`\n=== TESTE ${label}: ${scenario.description} ===`);
  
  let currentContext: any = { unitId: scenario.unitId };
  
  for (let i = 0; i < scenario.messages.length; i++) {
    const msg = scenario.messages[i];
    if (msg.role !== 'user') continue;

    console.log(`\n[Turno ${i}] Cliente: "${msg.content}"`);
    
    // 1. Extrair e Mesclar Contexto
    const extracted = extractBookingSlots(msg.content, new Date(), currentContext);
    currentContext = mergeBookingContext(currentContext, extracted);
    
    console.log("Contexto ANTES da IA:", JSON.stringify(currentContext, null, 2));

    // 2. Chamar IA (Usando apenas o content string, o SDK faz o wrap se necessário ou usamos o runAgent que já lida com isso)
    const result = await runAgent({
      conversationKey: `test-${label}-${Date.now()}`,
      unidadeId: scenario.unitId,
      messages: scenario.messages.slice(0, i + 1),
      customerContext: { bookingContext: currentContext },
      traceId: `test-trace-${label}-${i}`
    } as any);

    console.log("Julia:", result.text);
    
    const toolCalls = result.toolResults || [];
    console.log("Ferramentas chamadas:", toolCalls.map(t => (t as any).toolName).join(", "));
    
    if (toolCalls.some(t => (t as any).toolName === 'list_slots')) {
      console.log("✅ AVAILABILITY_TOOL_CALLED");
    }
  }
}

async function run_tests() {
  const CENTRO_ID = "1378";

  // TESTE A: serviço resolvido -> cliente informa "amanhã"
  await test_flow("A", {
    unitId: CENTRO_ID,
    description: "Serviço resolvido anteriormente, cliente envia data",
    messages: [
      { role: 'user', content: 'Quanto custa um corte?' },
      { role: 'assistant', content: 'O corte custa R$ 80,00. Gostaria de agendar?' },
      { role: 'user', content: 'quero para amanhã' }
    ]
  });
}

run_tests().catch(console.error);
