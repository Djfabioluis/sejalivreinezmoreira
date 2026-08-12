/**
 * Política central de identificação de assinaturas.
 * Fonte oficial: identificação SOMENTE por telefone cadastrado. CPF desativado.
 */
export const SUBSCRIPTION_PRIMARY_LOOKUP = "PHONE";
export const ALLOW_SUBSCRIPTION_CPF_FALLBACK = false;
export const SUBSCRIPTION_MAX_PHONE_ATTEMPTS = 2;
export const PHONE_REQUEST_MESSAGE = "Perfeito! 💜\n\nPara localizar o seu Plano Beauty, qual é o número de telefone cadastrado na assinatura?\n\nPode enviar com DDD.";
export const PHONE_RETRY_MESSAGE = "Não encontrei uma assinatura ativa com esse telefone. 💜\n\nPode conferir e me enviar novamente o número cadastrado no plano, com DDD?";
export const HUMAN_HANDOFF_MESSAGE = "Não consegui localizar sua assinatura pelos telefones informados. 💜\n\nVou encaminhar seu atendimento para nossa equipe verificar o cadastro e continuar com você por aqui.";
export const SUBSCRIPTION_STAGES = [
    "AWAITING_REGISTERED_PHONE",
    "LOOKING_UP_PHONE",
    "AWAITING_REGISTERED_PHONE_RETRY",
    "PLAN_FOUND",
    "HUMAN_HANDOFF",
];
export const SUBSCRIPTION_MESSAGES = {
    ASK_PHONE: PHONE_REQUEST_MESSAGE,
    RETRY_PHONE: PHONE_RETRY_MESSAGE,
    HUMAN_HANDOFF: HUMAN_HANDOFF_MESSAGE,
    TECHNICAL_HANDOFF: "Não consegui consultar seu plano agora por uma falha técnica. 💜\n\nVou encaminhar seu atendimento para nossa equipe verificar o que houve e continuar com você.",
    INVALID_PHONE: "Não consegui validar esse número. Pode enviar novamente com o DDD, por favor? 💜",
};
/** Códigos de erro TÉCNICO do BEMP — nunca devem virar "plano não encontrado". */
export const BEMP_TECHNICAL_ERROR_CODES = [
    "BEMP_TIMEOUT",
    "BEMP_UNAVAILABLE",
    "BEMP_UNAUTHORIZED",
    "BEMP_INVALID_RESPONSE",
    "BEMP_RATE_LIMITED",
];
export function isBempTechnicalError(code) {
    return !!code && BEMP_TECHNICAL_ERROR_CODES.includes(code);
}
/** Estados legados de CPF que devem ser limpos das conversas em andamento. */
export const LEGACY_CPF_CONTEXT_RESET = {
    awaitingCpf: false,
    cpfRequested: false,
    cpfValidationPending: false,
    subscriptionCpfValidated: false,
    subscriptionLookupFallbackActive: false,
};
const CPF_SOLICITATION_PATTERNS = [
    /\bcpf\b/i,
    /\binforme(?:\s+o)?\s+seu\s+cpf\b/i,
    /\bpreciso(?:\s+realmente)?(?:\s+do)?\s+seu\s+cpf\b/i,
    /\bqual(?:\s+é)?\s+o\s+seu\s+cpf\b/i,
    /\bme\s+(?:passe|informe)\s+(?:o\s+)?seu\s+cpf\b/i,
    /\bn[uú]mero\s+(?:do|de)\s+cpf\b/i,
    /000\.000\.000-00/i,
    /somente números ou no formato.*cpf/i,
    /localizar.*(?:plano|assinatura).*cpf/i,
    /verificar.*plano.*cpf/i,
    /informar.*cpf/i,
    /solicitar.*cpf/i
];
export function containsCpfSolicitation(text) {
    if (!text)
        return false;
    return CPF_SOLICITATION_PATTERNS.some(regex => regex.test(text));
}
/**
 * Proteção de saída: nenhuma mensagem do fluxo de assinatura pode mencionar CPF/documento.
 * Aplicada após o orquestrador E imediatamente antes do envio pela Evolution.
 */
export function enforceNoCpfInSubscriptionFlow(text, context) {
    if (!text)
        return { text, blocked: false };
    if (!containsCpfSolicitation(text)) {
        return { text, blocked: false };
    }
    // Se chegou aqui, contém solicitação de CPF.
    // Como ALLOW_SUBSCRIPTION_CPF_FALLBACK é falso, bloqueamos SEMPRE.
    const ctx = context || {};
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
