import { BempService } from "./bemp-service.server";
import { validateSubscriptionByPhone } from "./bemp/phone-validation.server";
import { logger } from "./observability/logger.server";

/**
 * Script de diagnóstico para validar a integração BEMP sem IA.
 */
async function runBempDiagnostic() {
  const TEST_PHONE = "41999999999"; // Substituir por telefone real para teste manual
  logger.info("DIAGNOSTIC_STARTED", "Iniciando diagnóstico BEMP", { phone: TEST_PHONE });

  try {
    // 1. Teste findCustomerByPhone
    logger.info("DIAGNOSTIC_STEP_1", "Testando findCustomerByPhone");
    const customerResponse = await BempService.findCustomerByPhone({
      countryCode: "55",
      areaCode: "41",
      number: "999999999"
    });
    
    logger.info("DIAGNOSTIC_STEP_1_RESULT", "Resposta recebida", { 
      type: typeof customerResponse,
      keys: customerResponse ? Object.keys(customerResponse) : []
    });

    // 2. Teste validateSubscriptionByPhone (fluxo completo)
    logger.info("DIAGNOSTIC_STEP_2", "Testando validateSubscriptionByPhone");
    const validationResult = await validateSubscriptionByPhone(TEST_PHONE);
    
    logger.info("DIAGNOSTIC_STEP_2_RESULT", "Resultado da validação", { 
      success: validationResult.success,
      code: (validationResult as any).code,
      plansFound: (validationResult as any).activePlans?.length ?? 0
    });

    console.log("\n--- RESULTADO FINAL DO DIAGNÓSTICO ---");
    console.log(JSON.stringify(validationResult, null, 2));
    
  } catch (err: any) {
    logger.error("DIAGNOSTIC_FAILED", err.message, { stack: err.stack });
  }
}

if (require.main === module) {
  runBempDiagnostic();
}
