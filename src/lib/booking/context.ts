/**
 * Contexto determinístico de agendamento (slot filling + merge persistente).
 *
 * Regras centrais:
 * - O contexto NUNCA é substituído pelos dados da mensagem atual; sempre MERGE.
 * - subscriptionIntent só é verdadeiro com menção EXPLÍCITA a plano/assinatura/benefício.
 */

export interface BookingContext {
  unitId?: string | null;
  serviceText?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  date?: string | null;
  period?: string | null;
  time?: string | null;
  professionalId?: string | null;
  professionalName?: string | null;
  subscriptionIntent?: boolean;
  conversationGreeted?: boolean;
}

export type BookingSlot =
  | "unit"
  | "service"
  | "date"
  | "period"
  | "time"
  | "professional"
  | "availability"
  | "confirmation";

/* ------------------------------------------------------------------ */
/* Subscription intent                                                 */
/* ------------------------------------------------------------------ */

const SUBSCRIPTION_INTENT_PATTERNS: RegExp[] = [
  /\bplanos?\b/i,
  /\bmeu\s+plano\b/i,
  /\bassinaturas?\b/i,
  /\bassinante\b/i,
  /\bbenef[ií]cios?\b/i,
  /\bmeu\s+pacote\b/i,
  /\bbeauty\s*club\b/i,
  /\bservi[çc]o\s+do\s+plano\b/i,
  /\bincluso\s+no\s+meu\s+plano\b/i,
  /\bmensalidade\b/i,
];

/** TRUE somente quando o cliente menciona explicitamente plano/assinatura/benefício. */
export function detectSubscriptionIntent(text: string | null | undefined): boolean {
  if (!text) return false;
  return SUBSCRIPTION_INTENT_PATTERNS.some((re) => re.test(text));
}

/* ------------------------------------------------------------------ */
/* Slot extraction                                                     */
/* ------------------------------------------------------------------ */

const WEEKDAYS: Array<{ re: RegExp; index: number }> = [
  { re: /\bdomingo\b/i, index: 0 },
  { re: /\bsegunda(?:-feira)?\b/i, index: 1 },
  { re: /\bter[çc]a(?:-feira)?\b/i, index: 2 },
  { re: /\bquarta(?:-feira)?\b/i, index: 3 },
  { re: /\bquinta(?:-feira)?\b/i, index: 4 },
  { re: /\bsexta(?:-feira)?\b/i, index: 5 },
  { re: /\bs[áa]bado\b/i, index: 6 },
];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/** Extrai apenas os campos presentes na mensagem atual. Ausência = undefined (nunca null destrutivo). */
export function extractBookingSlots(
  text: string | null | undefined,
  now: Date = new Date(),
): Partial<BookingContext> {
  const out: Partial<BookingContext> = {};
  if (!text) return out;

  const t = text.trim();

  // --- Data ---
  if (/\bhoje\b/i.test(t)) out.date = isoDate(now);
  else if (/\bdepois\s+de\s+amanh[ãa]\b/i.test(t)) out.date = isoDate(addDays(now, 2));
  else if (/\bamanh[ãa]\b/i.test(t)) out.date = isoDate(addDays(now, 1));
  else {
    const dm = t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (dm) {
      const day = Number(dm[1]);
      const month = Number(dm[2]);
      const year = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : now.getFullYear();
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        out.date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    } else {
      const wd = WEEKDAYS.find((w) => w.re.test(t));
      if (wd) {
        const diff = (wd.index - now.getDay() + 7) % 7 || 7;
        out.date = isoDate(addDays(now, diff));
      }
    }
  }

  // --- Período ---
  if (/\bmanh[ãa]\b/i.test(t)) out.period = "manhã";
  else if (/\btarde\b/i.test(t)) out.period = "tarde";
  else if (/\bnoite\b/i.test(t)) out.period = "noite";

  // --- Horário ---
  const time = t.match(/\b([01]?\d|2[0-3])\s*(?::|h|hs|horas?)\s*([0-5]\d)?\b/i);
  if (time) {
    const hh = String(Number(time[1])).padStart(2, "0");
    const mm = time[2] ? time[2] : "00";
    out.time = `${hh}:${mm}`;
  }

  // --- Intenção de assinatura ---
  if (detectSubscriptionIntent(t)) out.subscriptionIntent = true;

  return out;
}

/* ------------------------------------------------------------------ */
/* Merge                                                               */
/* ------------------------------------------------------------------ */

const EMPTY = (v: unknown) => v === undefined || v === null || v === "" || v === "UNKNOWN";

/**
 * MERGE aditivo: campos ausentes na mensagem atual preservam o valor anterior.
 * subscriptionIntent é "sticky": uma vez true, permanece true na conversa.
 */
export function mergeBookingContext(
  previous: BookingContext | null | undefined,
  extracted: Partial<BookingContext> | null | undefined,
): BookingContext {
  const prev = previous || {};
  const next: BookingContext = { ...prev };

  for (const [key, value] of Object.entries(extracted || {})) {
    if (EMPTY(value)) continue;
    (next as any)[key] = value;
  }

  next.subscriptionIntent = prev.subscriptionIntent === true || extracted?.subscriptionIntent === true;
  return next;
}

/* ------------------------------------------------------------------ */
/* Slot filling                                                        */
/* ------------------------------------------------------------------ */

export function knownSlots(ctx: BookingContext): Record<string, string> {
  const known: Record<string, string> = {};
  if (!EMPTY(ctx.unitId)) known["unit"] = String(ctx.unitId);
  if (!EMPTY(ctx.serviceName) || !EMPTY(ctx.serviceId)) {
    known["service"] = String(ctx.serviceName || ctx.serviceId);
  }
  if (!EMPTY(ctx.date)) known["date"] = String(ctx.date);
  if (!EMPTY(ctx.period)) known["period"] = String(ctx.period);
  if (!EMPTY(ctx.time)) known["time"] = String(ctx.time);
  if (!EMPTY(ctx.professionalName) || !EMPTY(ctx.professionalId)) {
    known["professional"] = String(ctx.professionalName || ctx.professionalId);
  }
  return known;
}

export function nextRequiredSlot(ctx: BookingContext): BookingSlot {
  const known = knownSlots(ctx);
  if (!known["unit"]) return "unit";
  if (!known["service"]) return "service";
  if (!known["date"]) return "date";
  if (!known["time"]) return "availability";
  return "confirmation";
}

/** Bloco textual injetado no prompt com o estado determinístico da conversa. */
export function buildBookingContextBlock(ctx: BookingContext): string {
  const known = knownSlots(ctx);
  const lines: string[] = [];

  lines.push(`- Unidade: ${known["unit"] ?? "UNKNOWN"}`);
  lines.push(`- Serviço: ${known["service"] ?? "UNKNOWN"}`);
  lines.push(`- Data: ${known["date"] ?? "UNKNOWN"}`);
  lines.push(`- Período: ${known["period"] ?? "UNKNOWN"}`);
  lines.push(`- Horário: ${known["time"] ?? "UNKNOWN"}`);
  lines.push(`- Profissional: ${known["professional"] ?? "UNKNOWN"}`);
  lines.push(`- Intenção de assinatura/plano declarada pelo cliente: ${ctx.subscriptionIntent === true ? "SIM" : "NÃO"}`);
  lines.push(`- Cliente já foi saudado nesta conversa: ${ctx.conversationGreeted === true ? "SIM" : "NÃO"}`);
  lines.push(`- PRÓXIMO CAMPO A OBTER: ${nextRequiredSlot(ctx)}`);

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Proteção de saída                                                   */
/* ------------------------------------------------------------------ */

const SUBSCRIPTION_OUTPUT_PATTERNS: RegExp[] = [
  /\bassinaturas?\b/i,
  /\bassinante\b/i,
  /\bplanos?\b/i,
  /\bbenef[ií]cios?\b/i,
  /\btelefone\s+cadastrado\b/i,
  /\bvalidar\s+(?:sua\s+)?assinatura\b/i,
  /\bbeauty\s*club\b/i,
];

/**
 * Se o cliente NÃO declarou intenção de plano, nenhuma resposta pode puxar o fluxo de assinatura.
 * Retorna texto saneado (linhas ofensivas removidas) ou fallback com a próxima pergunta correta.
 */
export function enforceNoSubscriptionFlow(
  text: string,
  ctx: BookingContext,
): { text: string; blocked: boolean } {
  if (!text) return { text, blocked: false };
  if (ctx.subscriptionIntent === true) return { text, blocked: false };

  const offending = SUBSCRIPTION_OUTPUT_PATTERNS.some((re) => re.test(text));
  if (!offending) return { text, blocked: false };

  const cleaned = text
    .split(/\n+/)
    .filter((line) => !SUBSCRIPTION_OUTPUT_PATTERNS.some((re) => re.test(line)))
    .join("\n")
    .trim();

  if (cleaned.length >= 20) {
    return { text: cleaned, blocked: true };
  }

  return { text: fallbackQuestionFor(ctx), blocked: true };
}

export function fallbackQuestionFor(ctx: BookingContext): string {
  switch (nextRequiredSlot(ctx)) {
    case "service":
      return "Qual serviço você gostaria de fazer? 💜";
    case "date":
      return "Qual dia você prefere? 💜";
    case "availability":
      return "Vou verificar os horários disponíveis. Você prefere manhã, tarde ou noite?";
    default:
      return "Perfeito! Posso seguir com o seu agendamento? 💜";
  }
}

/* ------------------------------------------------------------------ */
/* Confirmações curtas                                                 */
/* ------------------------------------------------------------------ */

const AFFIRMATIVE = /^(isso|isso\s*mesmo|sim|s|certo|correto|exatamente|exato|ok|pode\s*ser|confirmo|é\s*isso)[.!\s]*$/i;

export function isShortAffirmative(text: string | null | undefined): boolean {
  if (!text) return false;
  return AFFIRMATIVE.test(text.trim());
}
