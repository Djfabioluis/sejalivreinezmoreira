/**
 * Guardas determinísticas para a criação do agendamento.
 *
 * Regras:
 * - A data usada no CREATE_BOOKING é SEMPRE bookingContext.date (data absoluta já resolvida).
 * - Nunca recalcular "hoje"/"amanhã" na confirmação nem na criação.
 * - selectedSlot precisa pertencer ao MESMO dia civil local de bookingContext.date.
 */

import type { BookingContext } from "./context";
import { slotLocalDate, slotLocalTime, slotStart } from "./slot-time";

export interface CreateDateResolution {
  ok: boolean;
  date: string | null;
  time: string | null;
  /** Início a enviar para a BEMP (ISO local do slot real, quando existir). */
  start: string | null;
  mismatch: boolean;
  reason?: string;
}

/**
 * Resolve a data/horário finais do agendamento SEM recalcular nada.
 * Bloqueia quando o slot selecionado pertence a outro dia.
 */
export function resolveCreateDateTime(ctx: BookingContext): CreateDateResolution {
  const date = ctx.date ? String(ctx.date).slice(0, 10) : null;
  if (!date) {
    return { ok: false, date: null, time: ctx.time ?? null, start: null, mismatch: false, reason: "NO_ABSOLUTE_DATE" };
  }

  const slot = ctx.selectedSlot ? slotStart(ctx.selectedSlot) : "";
  const time = (slot ? slotLocalTime(slot) : null) || ctx.time || null;

  if (slot) {
    const slotDate = slotLocalDate(slot);
    if (slotDate && slotDate !== date) {
      return { ok: false, date, time, start: null, mismatch: true, reason: "DATE_SLOT_MISMATCH" };
    }
  }

  if (!time) {
    return { ok: false, date, time: null, start: null, mismatch: false, reason: "NO_TIME" };
  }

  // A data ABSOLUTA manda: mesmo que o slot traga outro formato, o dia civil é o resolvido.
  const start = slot && slotLocalDate(slot) === date ? slot : `${date}T${time}:00`;

  return { ok: true, date, time, start, mismatch: false };
}
