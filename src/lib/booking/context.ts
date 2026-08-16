import { logEvent } from "../evolution/logger.server";

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
  clarificationRequired?: boolean;
  candidates?: Array<{ id: string; name: string; price: number }>;
  availabilityCalled?: boolean;
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
  // Patterns extraem a INTENÇÃO NORMALIZADA (MANICURE para termos como "mão")
  { re: /\b(?:manicure|unha\s+da\s+m[ãa]o|fazer\s+a(?:s)?\s+m[ãa]o(?:s)?|fazer\s+m[ãa]o(?:s)?|servi[çc]o\s+de\s+m[ãa]o|m[ãa]o|mao)\b/i, name: "manicure" },
  { re: /\b(?:p[ée]|pedicure|unha\s+do\s+p[ée]|fazer\s+o\s+p[ée])\b/i, name: "pedicure" },
  { re: /\bp[ée]\s+e\s+m[ãa]o\b/i, name: "pé e mão" },
  { re: /\bcabelo\b/i, name: "cabelo" },
  { re: /\bescova\b/i, name: "escova" },
  { re: /\bcorte\b/i, name: "corte" },
  { re: /\bdepila[çc][ãa]o\b/i, name: "depilação" },
  { re: /\bsobrancelha\b/i, name: "sobrancelha" },
  { re: /\bdesign\b/i, name: "sobrancelha" },
  { re: /\bmassagem\b/i, name: "massagem" },
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
  previous: BookingContext | null | undefined = null,
): Partial<BookingContext> {
  const out: Partial<BookingContext> = {};
  if (!text) return out;

  const t = text.trim();

  // --- Serviço (Pattern) ---
  const foundService = SERVICE_PATTERNS.find((p) => p.re.test(t));
  if (foundService) {
    out.serviceText = foundService.name;
    // Log para auditoria determinística
    logEvent({
      instance: 'unknown',
      event: 'SERVICE_PATTERN_MATCHED',
      status: 'success',
      payload: { 
        input: t,
        patternMatch: foundService.name
      }
    }).catch(() => {});
  }

  // --- Data ---
  if (/\bhoje\b/i.test(t)) {
    out.date = isoDate(now);
    logEvent({ instance: 'unknown', event: 'DATE_RESOLVED', status: 'success', payload: { input: 'hoje', resolved: out.date } }).catch(() => {});
  } else if (/depois\s+de\s+amanh[ãa]/i.test(t)) {
    out.date = isoDate(addDays(now, 2));
    logEvent({ instance: 'unknown', event: 'DATE_RESOLVED', status: 'success', payload: { input: 'depois de amanhã', resolved: out.date } }).catch(() => {});
  } else if (/amanh[ãa]/i.test(t)) {
    out.date = isoDate(addDays(now, 1));
    logEvent({ instance: 'unknown', event: 'DATE_RESOLVED', status: 'success', payload: { input: 'amanhã', resolved: out.date } }).catch(() => {});
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

  // --- Serviço (Resolução de Ambiguidade Prioritária - Determinística) ---
  if (previous?.clarificationRequired && previous.candidates?.length && !out.serviceText) {
    console.log(`[DETERMINISTIC_RESOLUTION_ATTEMPT] Input: "${t}" | Candidates: ${previous.candidates.length}`);

    // 1. Tentar por índice ("o segundo", "opção 1", "1", "primeiro")
    // Padrões autorizados: "1", "primeiro", "o primeiro", "o 1"
    const ordinalMatch = t.match(/\b(?:a|o)?\s*(primeir[ao]|segund[ao]|terceir[ao]|quart[ao]|quint[ao])\b/i);
    const numericMatch = t.match(/\b(?:op[çc][ãa]o\s+|o\s+)?([1-5])\b/i);
    
    let index = -1;
    if (ordinalMatch) {
      const word = ordinalMatch[1].toLowerCase();
      if (word.startsWith("prim")) index = 0;
      else if (word.startsWith("segu")) index = 1;
      else if (word.startsWith("terc")) index = 2;
      else if (word.startsWith("quar")) index = 3;
      else if (word.startsWith("quin")) index = 4;
    } else if (numericMatch) {
      index = parseInt(numericMatch[1]) - 1;
    } else if (/^\s*([1-5])\s*[.!\s]*$/.test(t)) {
      // Caso o cliente responda apenas o número puro "1"
      index = parseInt(t.trim()) - 1;
    }

    if (index >= 0 && index < previous.candidates.length) {
      const selected = previous.candidates[index];
      console.log(`[DETERMINISTIC_SELECTION] Resolvido por índice: ${index + 1} (${selected.name})`);
      out.serviceId = String(selected.id);
      out.serviceName = selected.name;
      out.clarificationRequired = false;
      out.candidates = undefined; 
      // Manter a data anterior se disponível
      if (previous.date) out.date = previous.date;
      
      logEvent({
        instance: 'unknown',
        event: 'CLARIFICATION_SELECTION_RESOLVED',
        status: 'success',
        payload: { 
          method: 'index',
          index: index + 1,
          serviceId: out.serviceId,
          serviceName: out.serviceName,
          datePreserved: out.date
        }
      }).catch(() => {});
      
      return out;
    }

    // 2. Tentar por nome exato entre os candidatos (case insensitive)
    const normalizedInput = t.toLowerCase();
    const exactMatch = previous.candidates.find((c: any) => 
      normalizedInput.includes(c.name.toLowerCase()) || 
      c.name.toLowerCase() === normalizedInput
    );
    if (exactMatch) {
      console.log(`[DETERMINISTIC_SELECTION] Resolvido por nome: ${exactMatch.name}`);
      out.serviceId = String(exactMatch.id);
      out.serviceName = exactMatch.name;
      out.clarificationRequired = false;
      out.candidates = undefined;
      if (previous.date) out.date = previous.date;
      
      logEvent({
        instance: 'unknown',
        event: 'CLARIFICATION_SELECTION_RESOLVED',
        status: 'success',
        payload: { 
          method: 'name',
          serviceId: out.serviceId,
          serviceName: out.serviceName,
          datePreserved: out.date
        }
      }).catch(() => {});
      
      return out;
    }
  }


  // --- Período ---
  if (/manh[ãa]/i.test(t)) out.period = "manhã";
  else if (/tarde/i.test(t)) out.period = "tarde";
  else if (/noite/i.test(t)) out.period = "noite";

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
  if (!next.serviceText && prev.serviceText) next.serviceText = prev.serviceText;
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
  
  // Se temos o período mas não o horário, ainda estamos em 'availability', 
  // mas o controlador de fluxo (agent.server.ts) deve disparar a listagem de slots.
  // IMPORTANTE: Se period estiver presente e time/selectedSlot não, o fluxo determinístico
  // deve intervir ANTES de perguntar novamente.
  if (ctx.period && !ctx.time && !ctx.selectedSlot) return "availability";
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
      return "Perfeito! Para que eu possa listar os horários, você poderia me confirmar o serviço desejado? (Ex: Manicure, Pedicure, Escova, etc) 💜";
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
  
  const hasService = ctx.serviceId || ctx.serviceName || ctx.serviceText;
  if (hasService && !ctx.clarificationRequired) {
    if (t.includes("qual serviço") || t.includes("que serviço") || t.includes("qual o procedimento") || t.includes("procedimento deseja") || t.includes("gostaria de fazer o que") || t.includes("confirma qual seria o serviço")) {
      return { text: fallbackQuestionFor(ctx), blocked: true };
    }
  }
  
  if (ctx.date) {
    if (t.includes("qual dia") || t.includes("qual data") || t.includes("que dia") || t.includes("para quando") || t.includes("para que dia")) {
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
