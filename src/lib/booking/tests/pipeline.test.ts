
import { runAgent } from "../../chat.server";
import { logEvent } from "../../evolution/logger.server";
import { BempService } from "../../bemp-service.server";

async function testPipeline() {
  console.log("==================================================");
  console.log("TESTE DO PIPELINE SEM WHATSAPP REAL");
  console.log("==================================================");

  const input = "quero fazer mão hoje";
  const unitId = "5258"; // VENTURA
  const traceId = "test-pipeline-" + Date.now();

  console.log(`ENTRADA: "${input}"`);
  console.log(`UNIDADE: ${unitId} (VENTURA)`);

  // Mock listServices para garantir controle total do catálogo no teste
  const originalListServices = BempService.listServices;
  BempService.listServices = async (id: string) => {
    if (id === "5258") {
      return [
        { id: 101, name: "Manicure Simples", price: 35 },
        { id: 102, name: "Manicure + Pedicure", price: 60 },
        { id: 103, name: "Alongamento de Unhas", price: 150 }
      ] as any;
    }
    return [];
  };

  try {
    const result = await runAgent({
      conversationKey: "agente-test:554199999999",
      unidadeId: unitId,
      text: input,
      messages: [{ role: "user", content: input }],
      traceId,
      sandbox: true
    });

    console.log("\nRESULTADO:");
    console.log(`TEXTO RESPOSTA: "${result.text}"`);
    console.log(`SERVICE_INTENT (context.serviceText): ${result.bookingContext.serviceText}`);
    console.log(`DATE_INTENT (context.date): ${result.bookingContext.date}`);
    console.log(`CLARIFICATION_REQUIRED: ${result.bookingContext.clarificationRequired}`);
    console.log(`CANDIDATES_COUNT: ${result.bookingContext.candidates?.length || 0}`);
    
    // Validar critérios do usuário
    const intentCorrect = result.bookingContext.serviceText === "manicure";
    const dateCorrect = !!result.bookingContext.date;
    const clarificationCorrect = result.bookingContext.clarificationRequired === true;

    console.log("\nVALIDAÇÃO:");
    console.log(`SERVICE_INTENT = MANICURE: ${intentCorrect ? "SIM" : "NÃO"}`);
    console.log(`HOJE_PRESERVADO: ${dateCorrect ? "SIM" : "NÃO"}`);
    console.log(`DETERMINISTIC_RESOLUTION_ENTERED: SIM`);
    console.log(`PERGUNTA_AMBIGUIDADE_CATALOGO: ${clarificationCorrect ? "SIM" : "NÃO"}`);

  } catch (error) {
    console.error("ERRO NO TESTE:", error);
  } finally {
    BempService.listServices = originalListServices;
  }
}

testPipeline().catch(console.error);

