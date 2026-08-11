/**
 * Detecção determinística de pedido de atendimento humano.
 * Não depende de LLM.
 */

const STRIP_ACCENTS = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const HUMAN_TRANSFER_MESSAGE =
  "Claro! 💜 Vou transferir seu atendimento para a nossa equipe humana.\n\nPor favor, aguarde um momento que alguém vai continuar seu atendimento por aqui.";

export const AI_PAUSE_REASON_CUSTOMER = "CUSTOMER_REQUESTED_HUMAN";

// Termos que representam uma pessoa real da equipe
const HUMAN_TERMS = [
  "humano",
  "humana",
  "atendente",
  "recepcao",
  "recepcionista",
  "pessoa",
  "alguem",
  "equipe",
  "gerente",
  "responsavel",
  "secretaria",
  "funcionaria",
  "funcionario",
];

// Verbos/expressões que indicam intenção de falar/ser transferido
const INTENT_PATTERNS = [
  /\bfalar\s+com\b/,
  /\bconversar\s+com\b/,
  /\bme\s+(passa|passe|transfere|transfira|encaminha)\b/,
  /\bpassa(r)?\s+para\b/,
  /\btransfer(e|ir|ira)\b/,
  /\bchama(r)?\b/,
  /\bquero\s+atendimento\s+humano\b/,
  /\batendimento\s+humano\b/,
  /\bposso\s+falar\b/,
  /\bteria\s+como\s+falar\b/,
];

// Rejeição explícita ao robô
const ROBOT_REJECTION = [
  /\bnao\s+quero\s+falar\s+com\s+(robo|bot|ia|maquina|inteligencia)\b/,
  /\bnao\s+quero\s+(robo|bot|ia)\b/,
  /\bchega\s+de\s+(robo|bot|ia)\b/,
  /\bpara\s+de\s+ser\s+robo\b/,
  /\bvoce\s+e\s+(um\s+)?(robo|bot)\b.*\?/,
];

export function detectHumanTakeoverIntent(rawText: string | null | undefined): boolean {
  if (!rawText) return false;
  const text = STRIP_ACCENTS(String(rawText));
  if (!text) return false;

  for (const re of ROBOT_REJECTION) {
    if (re.test(text)) return true;
  }

  const hasHumanTerm = HUMAN_TERMS.some((t) => new RegExp(`\\b${t}\\b`).test(text));
  if (!hasHumanTerm) return false;

  // "pessoa de verdade", "pessoa real"
  if (/\bpessoa\s+(de\s+verdade|real)\b/.test(text)) return true;

  return INTENT_PATTERNS.some((re) => re.test(text));
}
