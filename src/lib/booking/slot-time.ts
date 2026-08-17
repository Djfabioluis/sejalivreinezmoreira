/**
 * Utilitários determinísticos de horário de slot (America/Sao_Paulo).
 *
 * - Extrai HH:mm do horário LOCAL do slot.
 * - Filtra por período (manhã / tarde / noite).
 * - Formata para apresentação (NUNCA expor ISO ao cliente).
 * - Preserva o slot original (ISO completo) para uso interno.
 */

export type Period = "manhã" | "tarde" | "noite";

const TZ = "America/Sao_Paulo";

/** Retorna o horário local do slot no formato HH:mm, ou null se não for parseável. */
export function slotLocalTime(slot: unknown): string | null {
  const raw = slotStart(slot);
  if (!raw) return null;

  // Se já tem offset explícito ou é ISO com hora local, usar diretamente.
  const isoMatch = raw.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    if (/[+-]\d{2}:\d{2}$/.test(raw) || /Z$/.test(raw)) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        if (/Z$/.test(raw)) return formatInTZ(d);
        // Offset explícito: o horário escrito já é o horário local do salão.
        return `${isoMatch[1]}:${isoMatch[2]}`;
      }
    }
    return `${isoMatch[1]}:${isoMatch[2]}`;
  }

  const hm = raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (hm) return `${String(Number(hm[1])).padStart(2, "0")}:${hm[2]}`;

  const d = new Date(raw);
  if (!isNaN(d.getTime())) return formatInTZ(d);

  return null;
}

function formatInTZ(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/** Extrai a string de início do slot (aceita string ou objeto BEMP). */
export function slotStart(slot: any): string {
  if (!slot) return "";
  if (typeof slot === "string") return slot;
  return String(slot.start || slot.time || slot.datetime || slot.inicio || "");
}

export function normalizePeriod(period: string | null | undefined): Period | null {
  if (!period) return null;
  const p = period
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (/(manha|matutino|cedo)/.test(p)) return "manhã";
  if (/(tarde|vespertino)/.test(p)) return "tarde";
  if (/(noite|noturno)/.test(p)) return "noite";
  return null;
}

/** MANHÃ 05:00–11:59 | TARDE 12:00–17:59 | NOITE 18:00–23:59 */
export function periodOfTime(hhmm: string): Period | null {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (isNaN(h)) return null;
  const minutes = h * 60 + m;
  if (minutes >= 5 * 60 && minutes < 12 * 60) return "manhã";
  if (minutes >= 12 * 60 && minutes < 18 * 60) return "tarde";
  if (minutes >= 18 * 60 && minutes <= 23 * 60 + 59) return "noite";
  return null;
}

/** Filtra slots pelo período, preservando o formato original de cada slot. */
export function filterSlotsByPeriod<T>(slots: T[], period: string | null | undefined): T[] {
  const target = normalizePeriod(period);
  if (!target) return slots;
  return slots.filter((s) => {
    const t = slotLocalTime(s);
    if (!t) return false;
    return periodOfTime(t) === target;
  });
}

/** Lista de HH:mm para apresentação ao cliente (sem ISO, sem timezone). */
export function formatSlotsForDisplay(slots: unknown[], limit = 10): string[] {
  const out: string[] = [];
  for (const s of slots) {
    const t = slotLocalTime(s);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

/** Localiza o slot REAL (ISO original) correspondente ao HH:mm escolhido. */
export function findSlotByTime(slots: unknown[], hhmm: string): string | null {
  for (const s of slots) {
    if (slotLocalTime(s) === hhmm) return slotStart(s) || String(s);
  }
  return null;
}
