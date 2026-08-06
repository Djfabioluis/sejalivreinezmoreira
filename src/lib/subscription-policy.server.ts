/**
 * Política central de identificação de assinaturas.
 * Fonte oficial: identificação SOMENTE por telefone cadastrado. CPF desativado.
 */

export const SUBSCRIPTION_PRIMARY_LOOKUP = "PHONE" as const;
export const ALLOW_SUBSCRIPTION_CPF_FALLBACK = false as const;
export const SUBSCRIPTION_MAX_PHONE_ATTEMPTS = 2;

export const PHONE_REQUEST_MESSAGE =
  "Perfeito! 💜\n\nQual é o número de telefone cadastrado na assinatura?\n\nPode enviar com DDD.";

export const PHONE_RETRY_MESSAGE =
  "Não encontrei uma assinatura ativa com esse telefone. 💜\n\nPode conferir e me enviar novamente o número cadastrado no plano, com DDD?";

export const HUMAN_HANDOFF_MESSAGE =
  "Não consegui localizar sua assinatura pelos telefones informados. 💜\n\nVou encaminhar seu atendimento para nossa equipe verificar o cadastro e continuar com você por aqui.";

export const SUBSCRIPTION_STAGES = [
  "AWAITING_REGISTERED_PHONE",
  "LOOKING_UP_PHONE",
  "AWAITING_REGISTERED_PHONE_RETRY",
  "PLAN_FOUND",
  "HUMAN_HANDOFF",
] as const;

export type SubscriptionStage = (typeof SUBSCRIPTION_STAGES)[number];

export const SUBSCRIPTION_MESSAGES = {
  ASK_PHONE: PHONE_REQUEST_MESSAGE,
  RETRY_PHONE: PHONE_RETRY_MESSAGE,
  HUMAN_HANDOFF: HUMAN_HANDOFF_MESSAGE,
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

export interface SubscriptionFlowContext {
  subscriptionIntent?: boolean;
  subscriptionPhoneValidated?: boolean;
  subscriptionLookupStage?: string;
  subscriptionPhoneAttempts?: number;
}

export function containsCpfSolicitation(text: string): boolean {
  if (!text) return false;
  
  // Padrões explícitos de solicitação de CPF
  const patterns = [
    /informe.*CPF/i,
    /informar.*CPF/i,
    /preciso.*CPF/i,
    /me informe.*CPF/i,
    /qual.*seu.*CPF/i,
    /número.*CPF/i,
    /seu número.*CPF/i,
    /000\.000\.000-00/,
    /somente números ou no formato/i,
    /localizar seu plano.*CPF/i,
    /localizar sua assinatura.*CPF/i,
    /verificar seu plano.*CPF/i,
    /me passe.*CPF/i,
    /validar plano.*CPF/i,
  ];

  return patterns.some(p => p.test(text));
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
  
  const cpfRequested = containsCpfSolicitation(text);
  
  // Se detectou solicitação de CPF, BLOQUEIA SEMPRE, independentemente de ALLOW_SUBSCRIPTION_CPF_FALLBACK
  // ou de subscriptionIntent, para garantir FAIL-CLOSED.
  if (!cpfRequested) {
    // Se não solicitou CPF explicitamente, verificamos se há menções genéricas que devem ser bloqueadas no fluxo de assinatura
    if (ctx.subscriptionIntent !== true) return { text, blocked: false };
    if (ctx.subscriptionPhoneValidated === true) return { text, blocked: false };
    
    const forbiddenPattern = /\bcpf\b|documento de identifica|\bdocumento\b|\d{3}\.\d{3}\.\d{3}-\d{2}|000\.000\.000-00/i;
    if (!forbiddenPattern.test(text)) return { text, blocked: false };
  }

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
