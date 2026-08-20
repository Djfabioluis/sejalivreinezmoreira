/**
 * NO_SLOTS_FOUND → AWAITING_ALTERNATIVE_CHOICE
 *
 * Após não encontrar horários, o cliente NÃO pode receber a mesma mensagem
 * novamente nem disparar a mesma busca. Este módulo é puro (sem I/O).
 */

export type AlternativeStage = "MENU" | "AWAITING_PERIOD" | "AWAITING_DATE";

const PERIODS = ["manhã", "tarde", "noite"] as const;

function normalize(text: string): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function noSlotsMessage(period?: string | null): string {
  const p = period ? String(period) : "esse período";
  return `Infelizmente não encontrei horários disponíveis para ${p} nesta data. 😔 Gostaria de tentar outro período ou outro dia?`;
}

export const ALTERNATIVE_MENU_MESSAGE =
  "Claro 💜 Você prefere tentar:\n1. Outro período no mesmo dia\n2. Outro dia";

export const ASK_DAY_MESSAGE = "Perfeito 💜 Para qual dia você gostaria de tentar?";

export function buildPeriodQuestion(failedPeriods: string[] = []): string {
  const failed = new Set(failedPeriods.map((p) => normalize(p)));
  const options = PERIODS.filter((p) => !failed.has(normalize(p)));
  const list = options.length ? options.join(", ") : PERIODS.join(", ");
  return `Sem problema 💜 Você prefere ${list}?`;
}

/** "sim", "quero", "pode", "ok" e variações naturais. */
export function isAlternativeAffirmative(text: string): boolean {
  const t = normalize(text).replace(/[.!?]+$/g, "");
  if (!t) return false;
  return /^(sim|s|isso|claro|quero|quero sim|pode|pode ser|pode sim|ok|okay|blz|beleza|vamos|bora|por favor|aceito|gostaria|gostaria sim|quero tentar|tentar)$/.test(
    t,
  );
}

/** Interpreta a escolha do menu: 1 = outro período, 2 = outro dia. */
export function parseAlternativeChoice(text: string): "period" | "day" | null {
  const t = normalize(text);
  if (!t) return null;
  if (/^(1|1\.|opcao 1|opção 1|um)$/.test(t)) return "period";
  if (/^(2|2\.|opcao 2|opção 2|dois)$/.test(t)) return "day";
  if (/(outro|outra).*(periodo|horario|turno)/.test(t)) return "period";
  if (/mesmo dia/.test(t)) return "period";
  if (/(outro|outra).*(dia|data)/.test(t)) return "day";
  return null;
}

export function extractPeriodChoice(text: string): string | null {
  const t = normalize(text);
  if (/\bmanha\b|\bmanhã\b/.test(t)) return "manhã";
  if (/\btarde\b/.test(t)) return "tarde";
  if (/\bnoite\b/.test(t)) return "noite";
  return null;
}

/**
 * Proteção anti-repetição: mesma resposta + mesmo estado = não reenviar.
 */
export function alternativeReplyKey(stage: string, message: string): string {
  return `${stage}::${normalize(message).slice(0, 120)}`;
}
