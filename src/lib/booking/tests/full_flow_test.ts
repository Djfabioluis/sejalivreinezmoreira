import { extractBookingSlots, mergeBookingContext, buildBookingContextBlock, ensureNoDuplicateBookingQuestion } from "../context";

const now = new Date();

async function runScenario(unitName: string, unitId: string, messages: string[]) {
  console.log(`\n=== SCENARIO: ${unitName} (${unitId}) ===`);
  let context: any = { unitId };

  for (const text of messages) {
    console.log(`> CLIENTE: "${text}"`);
    const extracted = extractBookingSlots(text, now, context);
    context = mergeBookingContext(context, extracted);
    
    console.log(`EVIDÊNCIA:`);
    console.log(`- unitId = ${context.unitId}`);
    console.log(`- serviceIntent = ${context.serviceText}`);
    console.log(`- date detectada = ${context.date}`);
    console.log(`- bookingContext = ${JSON.stringify(context)}`);

    // Simulando a IA decidindo o que perguntar
    const block = buildBookingContextBlock(context);
    console.log(`BLOCK PARA GEMINI:\n${block}`);
    
    // Teste de bloqueio de pergunta duplicada
    const question = "Para qual dia você gostaria de agendar?";
    const { text: filtered, blocked } = ensureNoDuplicateBookingQuestion(question, context);
    console.log(`PERGUNTA IA: "${question}"`);
    console.log(`BLOQUEADA = ${blocked}`);
    if (blocked) {
      console.log(`IA RESPONDERIA FALLBACK: "${filtered}"`);
    }

    if (context.serviceText && context.date && context.unitId) {
        console.log(`list_slots chamada = SIM (unit=${context.unitId}, date=${context.date})`);
    }
  }
}

async function main() {
  await runScenario("BOULEVARD", "1378", ["Quero fazer a mão hoje"]);
  await runScenario("CENTRO", "1377", ["Tem horário para mão hoje?"]);
  await runScenario("VENTURA", "5258", ["Quero fazer a mão amanhã"]);
  await runScenario("BOULEVARD", "1378", ["Quero fazer manicure hoje"]);
}

main().catch(console.error);
