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
  intent?: string | null;

  // Lifecycle fields
  selectedSlot?: string | null;
  selectedSlotEnd?: string | null;
  awaitingConfirmation?: boolean;
  customerConfirmed?: boolean;
  appointmentId?: string | null;
  appointmentStatus?: "NONE" | "AWAITING_CONFIRMATION" | "CREATING" | "CONFIRMED" | "FAILED";
  availableSlots?: string[];
}

export type BookingSlot =
  | "unit"
  | "service"
  | "date"
  | "period"
  | "time"
  | "professional"
  | "availability"
  | "confirmation"
  | "create_appointment"
  | "completed";

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

const SERVICE_PATTERNS: Array<{ re: RegExp; name: string }> = [
  { re: /\bmanicure\b/i, name: "MANICURE" },
  { re: /\bpedicure\b/i, name: "PEDICURE" },
  { re: /\bp[ée]\s+e\s+m[ãa]o\b/i, name: "PÉ E MÃO" },
  { re: /\bcabelo\b/i, name: "CABELO" },
  { re: /\bescova\b/i, name: "ESCOVA" },
  { re: /\bcorte\b/i, name: "CORTE" },
  { re: /\bdepila[çc][ãa]o\b/i, name: "DEPILAÇÃO" },
  { re: /\bsobrancelha\b/i, name: "SOBRANCELHA" },
  { re: /\bdesign\b/i, name: "SOBRANCELHA" },
  { re: /\bmassagem\b/i, name: "MASSAGEM" },
];

const HARMONIZATION_INTENT_PATTERN = /\b(?:h|a)rmoniza[cç][aã]o\s+(?:de|do|da|gl[uú]tea|abdominal)?\s*(?:bumbum|gl[uú]teos?|barriga|abd[oô]men)\b/i;

export function detectHarmonizationIntent(text: string | null | undefined): boolean {
  if (!text) return false;
  return HARMONIZATION_INTENT_PATTERN.test(text);
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
  if (/\bhoje\b/i.test(t)) {
    out.date = isoDate(now);
  } else if (/depois\s+de\s+amanh[ãa]/i.test(t)) {
    out.date = isoDate(addDays(now, 2));
  } else if (/amanh[ãa]/i.test(t)) {
    out.date = isoDate(addDays(now, 1));
  } else {
    // Tenta data no formato DD/MM
    const dm = t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (dm) {
      const day = Number(dm[1]);
      const month = Number(dm[2]);
      const year = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : now.getFullYear();
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        out.date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    } else {
      // Tenta dias da semana
      const wd = WEEKDAYS.find((w) => w.re.test(t));
      if (wd) {
        const todayIdx = now.getDay();
        const targetIdx = wd.index;
        let diff = (targetIdx - todayIdx + 7) % 7;
        if (diff === 0 && !/\bhoje\b/i.test(t)) diff = 7;
        out.date = isoDate(addDays(now, diff));
      }
    }
  }

  // --- Serviço ---
  const svc = SERVICE_PATTERNS.find((s) => s.re.test(t));
  if (svc) {
    out.serviceName = svc.name;
    out.serviceText = t;
  } else if (t.length > 3 && t.length < 30 && !out.date && !/manh[ãa]|tarde|noite/i.test(t)) {
    // Heurística: se for uma frase curta que não é data/período, pode ser um serviço novo
    // Mas evitamos sobrescrever se parecer apenas uma saudação como "Oi"
    if (!/^(oi|ol[aá]|bom\s+dia|boa\s+tarde|boa\s+noite)$/i.test(t)) {
      // out.serviceText = t; // Removido para evitar falsos positivos agressivos
    }
  }

  // --- Período ---
  if (/manh[ãa]/i.test(t)) out.period = "manhã";
  else if (/\btarde\b/i.test(t)) out.period = "tarde";
  else if (/\bnoite\b/i.test(t)) out.period = "noite";

  // --- Horário ---
  // Tenta extrair HH:mm de formatos variados
  const timeMatch = t.match(/\b([01]?\d|2[0-3])\s*(?::|h|hs|horas?)\s*([0-5]\d)?\b/i);
  if (timeMatch) {
    const hh = String(Number(timeMatch[1])).padStart(2, "0");
    const mm = timeMatch[2] ? timeMatch[2] : "00";
    out.time = `${hh}:${mm}`;
  } else if (/\b(\d{1,2})\b/.test(t) && t.length <= 2) {
    // Se o cliente digitar apenas "14", tratar como 14:00
    const h = Number(t);
    if (h >= 7 && h <= 21) {
      out.time = `${String(h).padStart(2, "0")}:00`;
    }
  }

  // --- Intenção de assinatura ---
  if (detectSubscriptionIntent(t)) out.subscriptionIntent = true;

  // --- Intenção de Harmonização (Boulevard) ---
  if (detectHarmonizationIntent(t)) {
    out.intent = "harmonizacao_bumbum_barriga";
  }

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
    // REQUISITO 6: Nunca substituir por null, merge aditivo
    (next as any)[key] = value;
  }

  next.subscriptionIntent = prev.subscriptionIntent === true || extracted?.subscriptionIntent === true;
  next.intent = extracted?.intent || prev.intent || null;
  
  // REQUISITO 7: Se serviceId ou date sumirem no loop, restauramos do prev
  if (!next.serviceId && prev.serviceId) next.serviceId = prev.serviceId;
  if (!next.serviceName && prev.serviceName) next.serviceName = prev.serviceName;
  if (!next.date && prev.date) next.date = prev.date;

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
  if (!ctx.unitId) return "unit";
  if (!ctx.serviceId && !ctx.serviceName) return "service";
  if (!ctx.date) return "date";
  if (!ctx.selectedSlot && !ctx.time) return "availability";
  if (ctx.appointmentStatus === "CONFIRMED") return "completed";
  if (!ctx.customerConfirmed) return "confirmation";
  return "create_appointment";
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
  lines.push(`- Horário Selecionado: ${ctx.selectedSlot ?? "NONE"}`);
  lines.push(`- Status do Agendamento: ${ctx.appointmentStatus ?? "NONE"}`);
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

const AFFIRMATIVE = /^(isso|isso\s*mesmo|sim|s|certo|correto|exatamente|exato|ok|pode\s*ser|confirmo|é\s*isso|pode\s*marcar|pode\s*agendar|pode\s*confirmar|fechado|é\s*esse|esse\s*mesmo)[.!\s]*$/i;

export function isShortAffirmative(text: string | null | undefined): boolean {
  if (!text) return false;
  return AFFIRMATIVE.test(text.trim());
}

/* ------------------------------------------------------------------ */
/* Proteção de duplicidade                                             */
/* ------------------------------------------------------------------ */

/**
 * Bloqueia perguntas que a IA faz sobre dados que já existem no contexto.
 */
export function ensureNoDuplicateBookingQuestion(text: string, ctx: BookingContext): { text: string; blocked: boolean } {
  const t = text.toLowerCase();
  
  
  if (ctx.serviceId || ctx.serviceName) {
    if (t.includes("qual serviço") || t.includes("que serviço") || t.includes("qual o procedimento") || t.includes("procedimento deseja")) {
      return { text: fallbackQuestionFor(ctx), blocked: true };
    }
  }
  
  if (ctx.date) {
    if (t.includes("qual dia") || t.includes("qual data") || t.includes("que dia")) {
      return { text: fallbackQuestionFor(ctx), blocked: true };
    }
  }
  
  if (ctx.selectedSlot || ctx.time) {
    if (t.includes("qual horário") || t.includes("que horas") || t.includes("qual hora")) {
      return { text: fallbackQuestionFor(ctx), blocked: true };
    }
  }

  // REQUISITO 11: Se o agendamento já estiver confirmado, Gemini não deve reiniciar fluxo
  if (ctx.appointmentStatus === "CONFIRMED") {
    if (t.includes("agendar") || t.includes("marcar") || t.includes("horário") || t.includes("procedimento")) {
      return { text: "Seu agendamento já está confirmado! 💜", blocked: true };
    }
  }

  return { text, blocked: false };
}
