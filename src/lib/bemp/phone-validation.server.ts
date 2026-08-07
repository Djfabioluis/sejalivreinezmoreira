import { z } from "zod";
import { BempService } from "@/lib/bemp-service.server";
import { logger } from "@/lib/observability/logger.server";
import { normalizeBrazilianPhone, maskPhone } from "@/lib/phone";
import { 
  extractPlansFromCustomer, 
  detectSubscriptionPlanType, 
  SUBSCRIPTION_SERVICE_MAP,
  type CustomerPlan 
} from "./subscriptions.server";

/**
 * Parser central para normalizar a resposta de cliente do BEMP.
 */
function parseCustomerResponse(response: any) {
  if (!response) return null;
  
  // BEMP pode retornar { customer: {...} }, { data: {...} }, { data: [...] } ou [...]
  const container = response.customer || response.data || response;
  const customers = Array.isArray(container) ? container : [container];
  
  // Filtrar apenas objetos válidos com ID
  const validCustomers = customers.filter(c => c && (c.id || c.customer_id));
  
  if (validCustomers.length === 0) return null;
  
  // Retorna o primeiro (em validateSubscriptionByPhone tratamos múltiplos)
  const c = validCustomers[0];
  return {
    id: c.id || c.customer_id,
    name: c.name || c.nome || "Cliente",
    phone: c.phone || c.telefone || c.whatsapp || null,
    email: c.email || null,
    raw: c
  };
}

export async function validateSubscriptionByPhone(phoneInput: string) {
  const traceId = Math.random().toString(36).substring(7);
  const normalized = normalizeBrazilianPhone(phoneInput);
  
  if (!normalized) {
    return {
      success: false,
      code: "INVALID_PHONE",
      message: "Não consegui validar esse número. Pode enviar novamente com o DDD, por favor? 💜",
    };
  }

  const { getPhoneVariants } = await import("@/lib/phone");
  const variants = getPhoneVariants(normalized);
  const phoneLast4 = normalized.number.slice(-4);
  const logCtx = { traceId, phoneLast4 };
  
  logger.info("SUBSCRIPTION_PHONE_LOOKUP_STARTED", "Iniciando busca de assinatura por telefone", logCtx);

  try {
    let customerData = null;
    let foundVariant = null;

    // Tentar variantes do telefone (8 vs 9 dígitos)
    for (const variant of variants) {
      const response = await BempService.findCustomerByPhone({
        countryCode: variant.countryCode,
        areaCode: variant.areaCode,
        number: variant.number,
      });

      const customer = parseCustomerResponse(response);
      if (customer) {
        customerData = customer;
        foundVariant = variant;
        break;
      }
    }

    if (!customerData) {
      logger.info("SUBSCRIPTION_NO_PLAN_FOUND", "Cliente não encontrado em nenhuma variante", logCtx);
      return {
        success: false,
        code: "CUSTOMER_NOT_FOUND",
        message: "Não encontrei um cadastro com esse telefone. Pode conferir o número cadastrado no plano? ✨",
      };
    }

    const customerId = customerData.id;
    const customerIdMasked = String(customerId).replace(/.(?=.{2})/g, "*");
    
    logger.info("SUBSCRIPTION_CUSTOMER_FOUND", "Cliente localizado", { ...logCtx, customerId: customerIdMasked });

    // 1. Verificar planos embutidos no objeto do cliente
    let evaluatedPlans = extractPlansFromCustomer(customerData.raw);
    
    if (evaluatedPlans.evaluated.length > 0) {
      logger.info("SUBSCRIPTION_EMBEDDED_PLANS_FOUND", "Planos localizados no objeto do cliente", { ...logCtx, count: evaluatedPlans.evaluated.length });
    } else {
      logger.info("SUBSCRIPTION_EMBEDDED_PLANS_EMPTY", "Objeto do cliente não contém planos embutidos, consultando endpoint de assinaturas", logCtx);
      
      // 2. Consultar endpoint real de assinaturas
      try {
        logger.info("SUBSCRIPTION_ENDPOINT_LOOKUP_STARTED", "Consultando listCustomerSubscriptions", { ...logCtx, customerId: customerIdMasked });
        const subscriptions = await BempService.listCustomerSubscriptions(customerId);
        
        logger.info("SUBSCRIPTION_ENDPOINT_LOOKUP_SUCCESS", "Endpoint de assinaturas retornado", { 
          ...logCtx, 
          count: Array.isArray(subscriptions) ? subscriptions.length : typeof subscriptions === 'object' ? 'object' : 'unknown'
        });

        // Normalizar resposta (extractPlansFromCustomer já lida com containers)
        evaluatedPlans = extractPlansFromCustomer({ subscriptions });
      } catch (err: any) {
        logger.error("SUBSCRIPTION_ENDPOINT_LOOKUP_FAILED", err.message, { ...logCtx, customerId: customerIdMasked });
        // Se falhar a consulta de assinaturas mas o cliente existe, tratamos como falha técnica em vez de "sem plano"
        return {
          success: false,
          code: "BEMP_UNAVAILABLE",
          message: "Encontrei seu cadastro, mas houve um erro ao carregar suas assinaturas. Vou pedir para nossa equipe verificar. 💜"
        };
      }
    }

    const { plans, inactivePlans, evaluated } = evaluatedPlans;

    if (evaluated.length === 0) {
      logger.info("SUBSCRIPTION_NO_PLAN_FOUND", "Nenhuma assinatura vinculada ao cliente", logCtx);
      return {
        success: false,
        code: "NO_SUBSCRIPTION",
        message: "Encontrei seu cadastro, mas não localizei nenhuma assinatura vinculada a ele. 💜",
        customer: { id: customerId, name: customerData.name, phoneMasked: maskPhone(normalized.full) }
      };
    }

    if (plans.length === 0) {
      const firstInactive = inactivePlans[0];
      let reasonMsg = "Encontrei seu plano, mas ele não parece estar ativo no momento. 💜";
      let code = "NO_ACTIVE_SUBSCRIPTION";

      if (firstInactive?.inactiveReason === "no_balance") {
        reasonMsg = "Seu plano está ativo, mas parece que o saldo de utilizações acabou. 💛";
        code = "SUBSCRIPTION_NO_BALANCE";
      } else if (firstInactive?.inactiveReason === "expired") {
        reasonMsg = "Seu plano foi localizado, mas parece que ele está vencido. 😔";
      }

      logger.info("SUBSCRIPTION_NO_PLAN_FOUND", "Apenas assinaturas inativas encontradas", { ...logCtx, reason: firstInactive?.inactiveReason });
      
      return {
        success: false,
        code,
        message: reasonMsg,
        customer: { id: customerId, name: customerData.name, phoneMasked: maskPhone(normalized.full) }
      };
    }

    logger.info("SUBSCRIPTION_ACTIVE_PLAN_FOUND", "Assinatura ativa localizada", { ...logCtx, activeCount: plans.length });

    // Mapear planos para o formato esperado pela IA
    const activePlans = plans.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      availableUses: p.availableUses,
      serviceName: p.serviceName
    }));

    return {
      success: true,
      customer: {
        id: customerId,
        name: customerData.name,
        phoneMasked: maskPhone(normalized.full)
      },
      activePlans
    };

  } catch (error: any) {
    logger.error("subscription_phone_validation_failed", error.message, { ...logCtx, status: error.status });
    
    if (error.status === 401 || error.status === 403) {
      return { success: false, code: "BEMP_UNAUTHORIZED", message: "Erro de autorização com a agenda." };
    }
    
    return {
      success: false,
      code: "BEMP_UNAVAILABLE",
      message: "Não consegui consultar seu plano agora. Vou encaminhar essa validação para nossa equipe. 💜"
    };
  }
}
