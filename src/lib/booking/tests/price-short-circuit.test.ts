import { BookingContext, nextRequiredSlot } from "../context";
import { getDeterministicResponse } from "../lifecycle";

/**
 * Teste de regressão para PRICE_INTENT short-circuit
 * Alvo: Garantir que "quanto custa a manicure" não gere "Qual dia você prefere?"
 */
export async function testPriceIntentShortCircuit() {
  console.log("--- INICIANDO TESTE: PRICE_INTENT SHORT-CIRCUIT ---");

  // Simular contexto onde o serviço foi detectado junto com a intenção de preço
  const ctx: BookingContext = {
    unitId: "5258",
    serviceText: "manicure",
    priceIntent: true,
    // Note: serviceId ainda não resolvido pela BEMP no início do processamento
  };

  console.log("Contexto Inicial:", JSON.stringify(ctx));
  
  const slot = nextRequiredSlot(ctx);
  console.log("PRÓXIMO SLOT DETECTADO:", slot);
  
  const response = getDeterministicResponse(ctx);
  console.log("RESPOSTA DETERMINÍSTICA GERADA:", response);

  if (slot === "date" && response === "Qual dia você prefere? 💜") {
    console.log("RESULTADO: FALHA - O sistema gerou a pergunta de data apesar do priceIntent.");
  } else {
    console.log("RESULTADO: SUCESSO - O sistema NÃO gerou a pergunta de data automaticamente.");
  }
}

testPriceIntentShortCircuit();
