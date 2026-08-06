/**
 * Política central de identificação de assinaturas.
 * Fonte oficial: identificação SOMENTE por telefone cadastrado. CPF desativado.
 */

export const SUBSCRIPTION_PRIMARY_LOOKUP = "PHONE" as const;
export const ALLOW_SUBSCRIPTION_CPF_FALLBACK = false as const;
export const SUBSCRIPTION_MAX_PHONE_ATTEMPTS = 2;

export const SUBSCRIPTION_STAGES = [
  "AWAITING_REGISTERED_PHONE",
  "LOOKING_UP_PHONE",
  "AWAITING_REGISTERED_PHONE_RETRY",
  "PLAN_FOUND",
  "HUMAN_HANDOFF",
] as const;

export type SubscriptionStage = (typeof SUBSCRIPTION_STAGES)[number];

export const SUBSCRIPTION_MESSAGES = {
  ASK_PHONE:
    "Perfeito! 💜\n\nQual é o número de telefone cadastrado na assinatura?\n\nPode enviar com DDD.",
  RETRY_PHONE:
    "Não encontrei uma assinatura ativa com esse telefone. 💜\n\nPode conferir e me enviar novamente o número cadastrado no plano, com DDD?",
  HUMAN_HANDOFF:
    "Não consegui localizar sua assinatura pelos telefones informados. 💜\n\nVou encaminhar seu atendimento para nossa equipe verificar o cadastro e continuar com você por aqui.",
  TECHNICAL_HANDOFF:
    "Não consegui consultar seu plano agora por uma falha técnica. 💜\n\nVou encaminhar seu atendimento para nossa equipe verificar o que houve e continuar com você.",
  INVALID_PHONE:
    "Não consegui validar esse número. Pode enviar novamente com o DDD, por favor? 💜",
} as const;

/** Códigos de erro TÉCNICO do BEMP — nunca devem virar "plano não encontrado". */
export const BEMP_TECHNICAL_ERROR_CODES = [
  "BEMP_TIMEOUT",
  "BEMP_UNAVAILABLE",
  "BEMP_UNAUTHORIZED",
  "BEMP_INVALID_RESPONSE",
  "BEMP_RATE_LIMITED",
] as const;

export function isBempTechnicalError(code?: string | null): boolean {
  return !!code && (BEMP_TECHNICAL_ERROR_CODES as readonly string[]).includes(code);
}

/** Estados legados de CPF que devem ser limpos das conversas em andamento. */
export const LEGACY_CPF_CONTEXT_RESET = {
  awaitingCpf: false,
  cpfRequested: false,
  cpfValidationPending: false,
  subscriptionCpfValidated: false,
  subscriptionLookupFallbackActive: false,
} as const;

const FORBIDDEN_OUTPUT_PATTERN =
  /\bcpf\b|documento de identifica|\bdocumento\b|\d{3}\.\d{3}\.\d{3}-\d{2}|000\.000\.000-00/i;

export interface SubscriptionFlowContext {
  subscriptionIntent?: boolean;
  subscriptionPhoneValidated?: boolean;
  subscriptionLookupStage?: string;
  subscriptionPhoneAttempts?: number;
}

/**
 * Proteção de saída: nenhuma mensagem do fluxo de assinatura pode mencionar CPF/documento.
 * Aplicada após o orquestrador E imediatamente antes do envio pela Evolution.
 */
export function enforceNoCpfInSubscriptionFlow(
  text: string,
  context: SubscriptionFlowContext | null | undefined,
): { text: string; blocked: boolean } {
  if (!text) return { text, blocked: false };
  const ctx = context || {};
  if (ALLOW_SUBSCRIPTION_CPF_FALLBACK) return { text, blocked: false };
  if (ctx.subscriptionIntent !== true) return { text, blocked: false };
  if (ctx.subscriptionPhoneValidated === true) return { text, blocked: false };
  if (!FORBIDDEN_OUTPUT_PATTERN.test(text)) return { text, blocked: false };

  const stage = ctx.subscriptionLookupStage;
  const attempts = ctx.subscriptionPhoneAttempts || 0;

  if (stage === "HUMAN_HANDOFF" || attempts >= SUBSCRIPTION_MAX_PHONE_ATTEMPTS) {
    return { text: SUBSCRIPTION_MESSAGES.HUMAN_HANDOFF, blocked: true };
  }
  if (stage === "AWAITING_REGISTERED_PHONE_RETRY" || attempts >= 1) {
    return { text: SUBSCRIPTION_MESSAGES.RETRY_PHONE, blocked: true };
  }
  return { text: SUBSCRIPTION_MESSAGES.ASK_PHONE, blocked: true };
}
