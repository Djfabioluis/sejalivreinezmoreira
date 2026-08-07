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

const CustomerSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string().optional(),
  nome: z.string().optional(),
}).passthrough();

export async function validateSubscriptionByPhone(phoneInput: string) {
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
  const logCtx = { phoneMasked: maskPhone(normalized.full) };
  logger.info("subscription_phone_validation_started", "Iniciando validação por telefone com variantes", logCtx);

  try {
    const phoneVariantsList = variants;
    let customerResponse = null;
    let foundNormalized = normalized;

    for (const variant of phoneVariantsList) {
      customerResponse = await BempService.findCustomerByPhone({
        countryCode: variant.countryCode,
        areaCode: variant.areaCode,
        number: variant.number,
      });

      const container = customerResponse?.customer || customerResponse?.data || customerResponse;
      const customers = Array.isArray(container) ? container : [container];
      const valid = customers.filter(c => c && (c.id || c.customer_id));
      
      if (valid.length > 0) {
        foundNormalized = variant;
        break;
      }
    }

    const container = customerResponse?.customer || customerResponse?.data || customerResponse;
    const customers = Array.isArray(container) ? container : [container];
    const validCustomers = customers.filter(c => c && (c.id || c.customer_id));

    if (validCustomers.length === 0) {
      return {
        success: false,
        code: "CUSTOMER_NOT_FOUND",
        message: "Não encontrei um cadastro com esse telefone. Pode conferir o número cadastrado no plano? ✨",
      };
    }

    if (validCustomers.length > 1) {
      logger.warn("subscription_phone_multiple_customers", "Múltiplos clientes encontrados", logCtx);
      return {
        success: false,
        code: "MULTIPLE_CUSTOMERS_FOUND",
        message: "Encontrei mais de um cadastro vinculado a esse telefone. Vou pedir ajuda à nossa equipe para confirmar o plano correto. 💜",
      };
    }

    const customer = validCustomers[0];
    const customerId = customer.id || customer.customer_id;
    const customerName = customer.name || customer.nome || "Cliente";

    // Buscar assinaturas vinculadas
    const { plans, inactivePlans } = extractPlansFromCustomer(customer);
    
    if (plans.length === 0) {
      if (inactivePlans.length > 0) {
        const firstInactive = inactivePlans[0];
        let reasonMsg = "Encontrei o cadastro, mas não localizei uma assinatura ativa vinculada a ele.";
        
        if (firstInactive.inactiveReason === "no_balance") {
          reasonMsg = "Seu plano está ativo, mas parece que o saldo de utilizações acabou. 💛";
        } else if (firstInactive.inactiveReason === "expired") {
          reasonMsg = "Seu plano foi localizado, mas parece que ele está vencido. 😔";
        }

        return {
          success: false,
          code: "NO_ACTIVE_SUBSCRIPTION",
          message: reasonMsg,
          customer: { id: customerId, name: customerName, phoneMasked: logCtx.phoneMasked }
        };
      }

      return {
        success: false,
        code: "NO_SUBSCRIPTION",
        message: "Encontrei o cadastro, mas não localizei uma assinatura vinculada a ele. 💜",
        customer: { id: customerId, name: customerName, phoneMasked: logCtx.phoneMasked }
      };
    }

    // Mapear serviços para os planos ativos
    const mappedPlans = plans.map(p => ({
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
        name: customerName,
        phoneMasked: logCtx.phoneMasked
      },
      activePlans: mappedPlans
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
