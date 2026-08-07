import { BempService } from "./bemp-service.server";
import { EvolutionService } from "./evolution/evolution-service.server";
import { logger } from "./observability/logger.server";

// Simulação de teste para fluxo de assinatura por telefone
async function testSubscriptionPhoneFlow() {
  logger.info("TEST_SUBSCRIPTION_PHONE_FLOW_STARTED", "Iniciando teste de fluxo de assinatura por telefone");
  try {
    const customer = await BempService.findCustomerByPhone({
      countryCode: "55",
      areaCode: "41",
      number: "999999999"
    });
    logger.info("TEST_SUBSCRIPTION_PHONE_FLOW_SUCCESS", "Busca por telefone concluída", { customer: !!customer });
  } catch (err: any) {
    logger.error("TEST_SUBSCRIPTION_PHONE_FLOW_FAILED", err.message);
    throw err;
  }
}

// Simulação de teste para promoção de mechas
async function testMechasPromotionFlow() {
  logger.info("TEST_MECHAS_PROMOTION_FLOW_STARTED", "Iniciando teste de promoção de mechas");
  try {
    const results = await BempService.searchServicesByCategory({
      effectiveUnitId: "1",
      category: "MECHAS",
      query: "mechas"
    });
    logger.info("TEST_MECHAS_PROMOTION_FLOW_SUCCESS", "Busca de mechas concluída", { count: results.data?.length });
  } catch (err: any) {
    logger.error("TEST_MECHAS_PROMOTION_FLOW_FAILED", err.message);
    throw err;
  }
}

async function runTests() {
  try {
    await testSubscriptionPhoneFlow();
    await testMechasPromotionFlow();
    logger.info("REGRESSION_TESTS_COMPLETED", "Todos os testes de regressão passaram");
  } catch (err) {
    logger.error("REGRESSION_TESTS_FAILED", "Falha nos testes de regressão");
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}
