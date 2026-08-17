import { logEvent } from "../evolution/logger.server";
import { getLocalBookingDate, addLocalDays, localWeekday } from "./local-date";

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
  /** "ANY" quando o cliente aceita qualquer profissional disponível. */
  professionalPreference?: "ANY" | null;
  /** Opções REAIS (BEMP) apresentadas ao cliente no turno anterior. */
  professionalOptions?: Array<{ id: string; name: string }>;
  /** TRUE quando a data já foi resolvida para uma data absoluta (imutável). */
  dateLocked?: boolean;

  subscriptionIntent?: boolean;
  priceIntent?: boolean; // PRICE_INTENT_DETECTED
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
  bookingSessionId?: string | null;
  periodSessionId?: string | null;
  /** Internal flag to indicate session was reset. */
  _isReset?: boolean;

  /** Cancelamento de agendamento JÁ confirmado na BEMP (aguardando confirmação do cliente). */
  pendingCancellation?: boolean;
  pendingCancellationBookingId?: string | null;
  pendingCancellationOptions?: Array<{
    id: string;
    serviceName: string;
    start: string;
    unitId: string | null;
  }>;

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

const SERVICE_PATTERNS: Array<{ re: RegExp; name: string }> = [
  { re: /\bp[ée]\s+e\s+m[ãa]o\b/i, name: "pé e mão" },
  { re: /\b(?:manicure|unha\s+da\s+m[ãa]o|fazer\s+a(?:s)?\s+m[ãa]o(?:s)?|fazer\s+m[ãa]o(?:s)?|servi[çc]o\s+de\s+m[ãa]o|m[ãa]o|mao)\b/i, name: "manicure" },
  { re: /\b(?:p[ée]|pedicure|unha\s+do\s+p[ée]|fazer\s+o\s+p[ée])\b/i, name: "pedicure" },
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

const PRICE_INTENT_PATTERNS = [
  /\bpre[çc]o\b/i,
  /\bvalor\b/i,
  /\bquanto\s+custa\b/i,
  /\bquanto\s+[eé]\b/i,
  /\bquanto\s+sai\b/i,
  /\bquanto\s+fica\b/i,
  /\bqual\s+o\s+valor\b/i,
  /\bquanto\s+voc[eê]s\s+cobram\b/i,
  /\bqual\s+valor\b/i,
];

export function detectPriceIntent(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return PRICE_INTENT_PATTERNS.some(re => re.test(t));
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

  // RESET LOGIC: Se houver uma nova intenção clara de agendamento e já tivermos um booking confirmado/falho, limpamos.
  // Expandido para capturar mais variações naturais que indicam um novo pedido.
  const isNewBookingIntent = /\b(?:quero|preciso|gostaria|agendar|marcar|fazer|hoje|amanh[ãa]|queria|tem|horario|vaga|reservar|consulta)\b/i.test(t) && 
                            SERVICE_PATTERNS.some(p => p.re.test(t));
  
  const isSessionReset = isNewBookingIntent && previous && (
    previous.appointmentStatus === "CONFIRMED" || 
    previous.appointmentStatus === "FAILED" ||
    previous.appointmentStatus === "AWAITING_CONFIRMATION" || // NOVO: Resetar mesmo se estiver aguardando confirmação
    (previous.date && previous.appointmentStatus === "NONE" && !previous.awaitingConfirmation) ||
    (previous.selectedSlot && previous.appointmentStatus === "AWAITING_CONFIRMATION")
  );

  if (isSessionReset) {
    (out as any)._isReset = true; // Flag interna para log/trace
  }



  if (isSessionReset) {
    // Preservar apenas identidade e saudação
    out.unitId = previous.unitId;
    out.conversationGreeted = previous.conversationGreeted;
    out.intent = null;
    out.serviceId = null;
    out.serviceName = null;
    out.serviceText = null;
    out.date = null;
    out.period = null;
    out.time = null;
    out.selectedSlot = null;
    out.availableSlots = [];
    out.candidates = undefined;
    out.clarificationRequired = false;
    out.appointmentStatus = "NONE";
    out.bookingSessionId = Math.random().toString(36).substring(7);
    console.log("[BOOKING_RESET] Nova sessão iniciada, limpando contexto anterior.");
    (out as any)._isReset = true;
  }

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
  const normalizedDateT = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (/\bhoje\b/i.test(normalizedDateT)) {
    out.date = getLocalBookingDate(now);
    logEvent({ instance: 'unknown', event: 'DATE_RESOLVED', status: 'success', payload: { input: 'hoje', resolved: out.date } }).catch(() => {});
  } else if (/depois\s+de\s+amanha/i.test(normalizedDateT)) {
    out.date = addLocalDays(getLocalBookingDate(now), 2);
    logEvent({ instance: 'unknown', event: 'DATE_RESOLVED', status: 'success', payload: { input: 'depois de amanhã', resolved: out.date } }).catch(() => {});
  } else if (/\bamanha\b/i.test(normalizedDateT)) {
    out.date = addLocalDays(getLocalBookingDate(now), 1);
    logEvent({ instance: 'unknown', event: 'DATE_RESOLVED', status: 'success', payload: { input: 'amanhã', resolved: out.date } }).catch(() => {});
  } else {
    // Tenta data no formato DD/MM
    const dm = t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (dm) {
      const day = Number(dm[1]);
      const month = Number(dm[2]);
      const year = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : Number(getLocalBookingDate(now).slice(0, 4));
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        out.date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    } else {
      // Tenta dias da semana
      const wd = WEEKDAYS.find((w) => w.re.test(t));
      if (wd) {
        const todayLocal = getLocalBookingDate(now);
        const todayIdx = localWeekday(todayLocal);
        const targetIdx = wd.index;
        let diff = (targetIdx - todayIdx + 7) % 7;
        if (diff === 0 && !/\bhoje\b/i.test(t)) diff = 7;
        out.date = addLocalDays(todayLocal, diff);
      }
    }
  }

  // DATA ABSOLUTA IMUTÁVEL: assim que uma expressão relativa/explícita é resolvida,
  // a data vira absoluta e nunca mais é recalculada (nem na virada da meia-noite).
  if (out.date) out.dateLocked = true;


  // --- Serviço (Resolução de Ambiguidade Prioritária - Determinística) ---
  if (previous?.clarificationRequired && previous.candidates?.length) {
    console.log(`[DETERMINISTIC_RESOLUTION_ATTEMPT] Input: "${t}" | Candidates: ${previous.candidates.length}`);
    const normalizedInput = t.toLowerCase().trim();
    const isServiceInput = SERVICE_PATTERNS.some(p => p.re.test(t));

    // Se a mensagem contém um NOVO padrão de serviço mas não contém índices,
    // talvez o cliente ignorou as opções e pediu algo novo.
    // Mas se for APENAS índice ou nome das opções, resolvemos aqui.
    
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
      
    }
  }

  console.log(`[EXTRACT_DEBUG] Before period check for "${t}": out.period=${out.period}`);
  // --- Período (sem acentos e sem confundir "amanhã" com "manhã") ---
  const normalizedT = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bdepois\s+de\s+amanha\b/g, " ")
    .replace(/\bamanha\b/g, " ");
  if (/\bmanha\b|\bmanhas\b|\bmanhazinha\b/.test(normalizedT)) {
    out.period = "manhã";
  } else if (/\btarde\b|\btardezinha\b/.test(normalizedT)) {
    out.period = "tarde";
  } else if (/\bnoite\b|\bnoitinha\b|\bnoi\b|\banoite\b/.test(normalizedT)) {
    out.period = "noite";
  }

  // --- Horário ---
  // Normalização agressiva para capturar horas da mensagem
  const normalizedTextForTime = t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Pattern para capturar horários explícitos (18:00, 18h, 18:40, 18 horas)
  const timeMatch = normalizedTextForTime.match(/\b([01]?\d|2[0-3])\s*(?::|h|hs|horas?)\s*([0-5]\d)?\b/i);
  
  // Pattern para frases naturais ("as 18", "quero o das 18", "pode ser 18")
  const naturalTimeMatch = normalizedTextForTime.match(/(?:^|\s)(?:as|a|o|quero|pode\s+ser\s+as|pode\s+ser\s+o\s+das|quero\s+o\s+das)\s*(\d{1,2})(?:\s*h\s*)?$/i);
  
  if (timeMatch || naturalTimeMatch) {
    const match = timeMatch || naturalTimeMatch;
    const hh = String(Number(match![1])).padStart(2, "0");
    const mm = (timeMatch && timeMatch[2]) ? timeMatch[2] : "00";
    const parsedTime = `${hh}:${mm}`;
    
    // Validação contra slots reais se existirem no previous
    if (previous?.availableSlots?.length) {
      const exactHour = `${hh}:00`;
      const hourSlots = previous.availableSlots.filter(s => {
        const slotTime = s.includes('T') ? s.split('T')[1].slice(0, 5) : s.slice(0, 5);
        return slotTime.startsWith(hh);
      });

      // Regra: se o cliente disse apenas a hora (mm=00), priorizar match exato HH:00
      let bestMatch = null;
      if (mm === "00") {
        bestMatch = hourSlots.find(s => {
          const slotTime = s.includes('T') ? s.split('T')[1].slice(0, 5) : s.slice(0, 5);
          return slotTime === exactHour;
        });
      }

      // Se não achou match exato de hora cheia, ou se mm != 00, procura o parsedTime exato
      if (!bestMatch) {
        bestMatch = hourSlots.find(s => {
          const slotTime = s.includes('T') ? s.split('T')[1].slice(0, 5) : s.slice(0, 5);
          return slotTime === parsedTime;
        });
      }
      
      if (bestMatch) {
        out.selectedSlot = bestMatch;
        out.time = bestMatch.includes('T') ? bestMatch.split('T')[1].slice(0, 5) : bestMatch.slice(0, 5);
      } else {
        out.time = parsedTime;
      }
    } else {
      out.time = parsedTime;
    }
  } else {
    // Tenta capturar apenas o número se a mensagem for curta (ex: "18")
    const hourOnlyMatch = normalizedTextForTime.match(/^\s*(\d{1,2})(?:\s*h\s*)?\s*$/i);
    if (hourOnlyMatch) {
      const h = Number(hourOnlyMatch[1]);
      if (h >= 7 && h <= 22) {
        const hh = String(h).padStart(2, "0");
        const parsedTime = `${hh}:00`;
        
        if (previous?.availableSlots?.length) {
          const validSlot = previous.availableSlots.find(s => {
            const slotTime = s.includes('T') ? s.split('T')[1].slice(0, 5) : s.slice(0, 5);
            return slotTime === parsedTime;
          });
          if (validSlot) {
            out.selectedSlot = validSlot;
            out.time = parsedTime;
          } else {
            out.time = parsedTime;
          }
        } else {
          out.time = parsedTime;
        }
      }
    }
  }

  // --- Intenção de assinatura ---
  if (detectSubscriptionIntent(t)) out.subscriptionIntent = true;

  // --- Intenção de Harmonização (Boulevard) ---
  if (detectHarmonizationIntent(t)) {
    out.intent = "harmonizacao_bumbum_barriga";
  }
  
  // --- Intenção de preço ---
  if (detectPriceIntent(t)) {
    out.priceIntent = true;
    console.log("[PRICE_INTENT_DETECTED] SIM");
  }

  // LOG PARA DEBUG
  if (out.period || out.time || out.serviceText || out.priceIntent) {
    console.log(`[EXTRACTED_DEBUG] text="${t}" period=${out.period}, time=${out.time}, selectedSlot=${out.selectedSlot}, priceIntent=${out.priceIntent}`);
  }

  console.log(`[EXTRACT_DEBUG] Returning out for "${t}": ${JSON.stringify(out)}`);
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
export function newBookingSessionId(): string {
  return `bs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Zera todos os campos transitórios e abre uma NOVA sessão de booking. */
export function startNewBookingSession(ctx: BookingContext): BookingContext {
  const next: BookingContext = { ...ctx };
  next.bookingSessionId = newBookingSessionId();
  next.period = null;
  next.periodSessionId = null;
  next.time = null;
  next.selectedSlot = null;
  next.selectedSlotEnd = null;
  next.availableSlots = [];
  next.availabilityCalled = false;
  next.awaitingConfirmation = false;
  next.customerConfirmed = false;
  next.clarificationRequired = false;
  next.candidates = undefined;
  next.professionalId = null;
  next.professionalName = null;
  next.professionalPreference = null;
  next.professionalOptions = undefined;
  if (next.appointmentStatus !== "CONFIRMED") next.appointmentStatus = "NONE";
  return next;
}

/* ------------------------------------------------------------------ */
/* Profissional                                                        */
/* ------------------------------------------------------------------ */

const ANY_PROFESSIONAL =
  /(qualquer|tanto\s*faz|indiferente|sem\s*prefer[eê]ncia|quem\s*(estiver|tiver)\s*dispon[ií]vel|o\s*que\s*estiver\s*dispon[ií]vel|pode\s*ser\s*qualquer)/i;

/** TRUE quando o cliente aceita qualquer profissional disponível. */
export function isAnyProfessionalChoice(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ANY_PROFESSIONAL.test(t) || ANY_PROFESSIONAL.test(text);
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/**
 * Resolve a resposta do cliente contra as opções REAIS de profissionais.
 * Aceita índice ("1", "primeiro") ou nome/parte do nome.
 */
export function matchProfessionalChoice(
  text: string | null | undefined,
  options: Array<{ id: string; name: string }> | null | undefined,
): { id: string; name: string } | null {
  if (!text || !options?.length) return null;
  const t = norm(text);

  const ordinals = ["primeir", "segund", "terceir", "quart", "quint"];
  const ordIdx = ordinals.findIndex((o) => new RegExp(`\\b${o}[ao]\\b`).test(t));
  if (ordIdx >= 0 && ordIdx < options.length) return options[ordIdx];

  const numMatch = t.match(/^\s*(?:op[cç][aã]o\s*)?([1-9])\s*[.!)]?\s*$/) || t.match(/\bop[cç][aã]o\s*([1-9])\b/);
  if (numMatch) {
    const idx = Number(numMatch[1]) - 1;
    // Índice além das opções reais = "qualquer profissional" (última opção da lista exibida)
    if (idx >= 0 && idx < options.length) return options[idx];
  }

  const exact = options.find((o) => norm(o.name) === t);
  if (exact) return exact;

  const partial = options.find((o) => {
    const n = norm(o.name);
    if (n.length < 3) return false;
    if (t.includes(n)) return true;
    return n.split(" ").some((part) => part.length >= 3 && new RegExp(`\\b${part}\\b`).test(t));
  });
  return partial ?? null;
}

/** Índice "qualquer profissional" na lista exibida (options.length + 1). */
export function isAnyProfessionalIndex(
  text: string | null | undefined,
  options: Array<{ id: string; name: string }> | null | undefined,
): boolean {
  if (!text || !options) return false;
  const m = norm(text).match(/^\s*(?:op[cç][aã]o\s*)?([1-9])\s*[.!)]?\s*$/);
  if (!m) return false;
  return Number(m[1]) === options.length + 1;
}


/** Período só é válido se foi informado NA SESSÃO DE BOOKING ATUAL. */
export function hasCurrentSessionPeriod(ctx: BookingContext): boolean {
  if (!ctx.period) return false;
  if (!ctx.bookingSessionId) return false;
  return ctx.periodSessionId === ctx.bookingSessionId;
}

export function mergeBookingContext(
  previous: BookingContext | null | undefined,
  extracted: Partial<BookingContext> | null | undefined,
): BookingContext {
  const prev = previous || {};
  let next: BookingContext = { ...prev };
  const isReset = (extracted as any)?._isReset === true;

  // NOVA SESSÃO: novo serviço detectado (diferente do anterior) e sem confirmação pendente
  const incomingService = extracted?.serviceId
    ? `id:${extracted.serviceId}`
    : extracted?.serviceText
      ? `text:${String(extracted.serviceText).toLowerCase()}`
      : null;
  const previousService = prev.serviceId
    ? `id:${prev.serviceId}`
    : prev.serviceText
      ? `text:${String(prev.serviceText).toLowerCase()}`
      : null;
  const startsNewSession =
    isReset ||
    !prev.bookingSessionId ||
    (!!incomingService && incomingService !== previousService && prev.awaitingConfirmation !== true);

  if (startsNewSession) {
    next = startNewBookingSession(next);
  }
  
  if (isReset) {
    console.log("[MERGE_DEBUG] Aplicando reset de contexto");
    next.serviceId = extracted?.serviceId ?? null;
    next.serviceName = extracted?.serviceName ?? null;
    next.serviceText = extracted?.serviceText ?? null;
    next.date = extracted?.date ?? null;
    next.dateLocked = !!extracted?.date;
    next.professionalId = null;
    next.professionalName = null;
    next.professionalPreference = null;
    next.professionalOptions = undefined;

    next.period = extracted?.period ?? null;
    next.periodSessionId = extracted?.period ? next.bookingSessionId ?? null : null;
    next.time = extracted?.time ?? null;
    next.selectedSlot = extracted?.selectedSlot ?? null;
    next.availableSlots = extracted?.availableSlots ?? [];
    next.candidates = extracted?.candidates ?? undefined;
    next.clarificationRequired = extracted?.clarificationRequired ?? false;
    next.appointmentStatus = "NONE";
    return next;
  }

  console.log("[MERGE_DEBUG] Merge normal");
  for (const [key, value] of Object.entries(extracted || {})) {
    if (EMPTY(value)) continue;
    // REQUISITO 6: Nunca substituir por null, merge aditivo
    (next as any)[key] = value;
  }

  // Proveniência do período: só vale se informado nesta sessão
  if (!EMPTY(extracted?.period)) {
    next.periodSessionId = next.bookingSessionId ?? null;
  } else if (next.periodSessionId !== next.bookingSessionId) {
    next.period = null;
    next.periodSessionId = null;
  }

  next.subscriptionIntent = prev.subscriptionIntent === true || extracted?.subscriptionIntent === true;
  next.intent = extracted?.intent || prev.intent || null;
  
  // PRESERVE CANDIDATES during clarification
  if (!startsNewSession && prev.clarificationRequired && !extracted?.serviceId && prev.candidates) {
    next.candidates = prev.candidates;
    next.clarificationRequired = true;
  }

  if (!next.serviceId && prev.serviceId && extracted?.serviceId === undefined && !isReset) next.serviceId = prev.serviceId;
  if (!next.serviceName && prev.serviceName && extracted?.serviceName === undefined && !isReset) next.serviceName = prev.serviceName;
  if (!next.serviceText && prev.serviceText && extracted?.serviceText === undefined && !isReset) next.serviceText = prev.serviceText;
  if (!next.date && prev.date && extracted?.date === undefined && !isReset) next.date = prev.date;

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
  if (!ctx.date) {
    // Se há uma intenção de preço ativa, não avançamos para a pergunta de data ainda.
    // O price handler deve responder primeiro.
    if (ctx.priceIntent) return "service"; 
    return "date";
  }

  // NOVO ESTADO: PROFISSIONAL antes do período/horários.
  if (!ctx.professionalId && ctx.professionalPreference !== "ANY" && !ctx.selectedSlot && !ctx.time) {
    return "professional";
  }


  
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

const AFFIRMATIVE = /^(isso|isso\s*mesmo|sim(\s*,?\s*(por\s*favor|pode|quero|claro))?|s|certo|correto|exatamente|exato|ok(ay)?|beleza|blz|claro|perfeito|com\s*certeza|pode|pode\s*ser|pode\s*sim|confirmo|confirma(r)?|quero\s*sim|e\s*isso|eh\s*isso|pode\s*marcar|pode\s*agendar|pode\s*confirmar|fechado|fechou|bora|vamos|e\s*esse|esse\s*mesmo|👍|✅)[.!\s👍💜✅]*$/i;

export function isShortAffirmative(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return AFFIRMATIVE.test(normalized);
}

/* ------------------------------------------------------------------ */
/* Saudação genérica / contexto antigo                                 */
/* ------------------------------------------------------------------ */

const GREETING_ONLY =
  /^(oi+|ol[áa]|ola|opa|e a[íi]|bom\s*dia|boa\s*tarde|boa\s*noite|hey|hi|hello|oi\s*tudo\s*bem\??|ol[áa]\s*tudo\s*bem\??|tudo\s*bem\??)[\s,.!?😊💜🙏👋]*$/i;

/** TRUE quando a mensagem é apenas uma saudação genérica, sem seleção ou pedido explícito. */
export function isGenericGreeting(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length > 40) return false;
  return GREETING_ONLY.test(t);
}

/**
 * Limpa os campos transitórios de booking (contexto antigo), preservando
 * apenas identidade: unidade, saudação e status já confirmado.
 */
export function clearTransientBooking(ctx: BookingContext): BookingContext {
  const next: BookingContext = startNewBookingSession({ ...ctx });
  next.serviceId = null;
  next.serviceName = null;
  next.serviceText = null;
  next.date = null;
  next.dateLocked = false;

  next.period = null;
  next.time = null;
  next.selectedSlot = null;
  next.selectedSlotEnd = null;
  next.availableSlots = [];
  next.candidates = undefined;
  next.clarificationRequired = false;
  next.awaitingConfirmation = false;
  next.customerConfirmed = false;
  next.availabilityCalled = false;
  next.intent = null;
  if (next.appointmentStatus !== "CONFIRMED") next.appointmentStatus = "NONE";
  return next;
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

/* ------------------------------------------------------------------ */
/* Cancelamento (prioridade máxima)                                    */
/* ------------------------------------------------------------------ */

const CANCEL_INTENT =
  /^(cancelar|cancela|cancelamento|desmarcar|desmarca|quero\s+desmarcar|quero\s+cancelar|cancelar\s+meu\s+horario|cancelar\s+agendamento|cancelar\s+o\s+agendamento|cancelar\s+meu\s+agendamento|desistir|desisti|pare|parar|nao\s+quero\s+mais|nao\s+quero|deixa\s+pra\s+la)[\s.,!?💜]*$/;

/** Detecta deterministicamente a intenção de cancelar (normalizado, sem acento). */
export function detectCancelIntent(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = String(text)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
  if (!t || t.length > 40) return false;
  return CANCEL_INTENT.test(t);
}

/** TRUE quando há um fluxo de agendamento em andamento (ainda não criado na BEMP). */
export function hasBookingInProgress(ctx: BookingContext): boolean {
  return Boolean(
    ctx.serviceId ||
      ctx.serviceName ||
      ctx.serviceText ||
      ctx.date ||
      ctx.period ||
      ctx.time ||
      ctx.selectedSlot ||
      ctx.professionalId ||
      ctx.professionalPreference ||
      ctx.awaitingConfirmation,
  );
}

/** Reseta o contexto para IDLE após cancelamento do fluxo. */
export function resetBookingForCancel(ctx: BookingContext): BookingContext {
  const next = clearTransientBooking({ ...ctx });
  next.professionalId = null;
  next.professionalName = null;
  next.professionalPreference = null;
  next.professionalOptions = undefined;
  next.subscriptionIntent = false;
  (next as any).createBookingKey = null;
  (next as any).confirmationSentFor = null;
  if (next.appointmentStatus !== "CONFIRMED") next.appointmentStatus = "NONE";
  return next;
}

export const CANCEL_FLOW_MESSAGE =
  "Sem problema 💜 O agendamento em andamento foi cancelado. Se quiser começar novamente, é só me chamar.";
export const CANCEL_IDLE_MESSAGE =
  "Sem problema 💜 Não há nenhum agendamento em andamento. Se quiser iniciar um novo, é só me chamar.";
