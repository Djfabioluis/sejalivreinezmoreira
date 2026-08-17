/**
 * Orquestração do cancelamento (fluxo em andamento OU agendamento confirmado na BEMP).
 * Lógica isolada e testável — a BEMP entra por injeção de dependência.
 */
import {
  detectCancelIntent,
  hasBookingInProgress,
  resetBookingForCancel,
  CANCEL_FLOW_MESSAGE,
  type BookingContext,
} from "./context";
import {
  buildCancelSuccessMessage,
  buildMultipleCancelList,
  buildSingleCancelConfirmation,
  chooseBookingFromReply,
  filterFutureBookingsForUnit,
  isCancelAbort,
  isCancelConfirmation,
  CANCEL_FAILED_MESSAGE,
  NO_FUTURE_BOOKINGS_MESSAGE,
  type BempBooking,
} from "./cancel-existing";

export type CancelDeps = {
  listAppointments: () => Promise<unknown>;
  cancelAppointment: (bookingId: string) => Promise<unknown>;
};

export type CancelTelemetry = {
  cancelIntent: boolean;
  transientBookingFound: boolean;
  bempLookupCalled: boolean;
  futureBookingsFound: number;
  cancelConfirmationAsked: boolean;
  multipleBookingsListed: boolean;
  cancelBookingCalled: boolean;
  cancelBookingCallCount: number;
  bempCancelSuccess: boolean;
  cancelBookingError?: string;
  unitMismatchBlocked: boolean;
};

export type CancelResult = {
  handled: boolean;
  message?: string;
  nextContext?: BookingContext;
  telemetry: CancelTelemetry;
};

function baseTelemetry(): CancelTelemetry {
  return {
    cancelIntent: false,
    transientBookingFound: false,
    bempLookupCalled: false,
    futureBookingsFound: 0,
    cancelConfirmationAsked: false,
    multipleBookingsListed: false,
    cancelBookingCalled: false,
    cancelBookingCallCount: 0,
    bempCancelSuccess: false,
    unitMismatchBlocked: false,
  };
}

function clearPending(ctx: BookingContext): BookingContext {
  const next: any = { ...ctx };
  next.pendingCancellation = false;
  next.pendingCancellationBookingId = null;
  next.pendingCancellationOptions = undefined;
  next.pendingCancellationSelected = undefined;
  return next;
}

async function runCancel(
  booking: BempBooking,
  conversationUnitId: string | number | null | undefined,
  ctx: BookingContext,
  deps: CancelDeps,
  t: CancelTelemetry,
): Promise<CancelResult> {
  const unit = conversationUnitId != null ? String(conversationUnitId) : null;
  if (unit && booking.unitId && booking.unitId !== unit) {
    t.unitMismatchBlocked = true;
    return { handled: true, message: CANCEL_FAILED_MESSAGE, nextContext: clearPending(ctx), telemetry: t };
  }

  t.cancelBookingCalled = true;
  t.cancelBookingCallCount = 1;
  try {
    await deps.cancelAppointment(booking.id);
    t.bempCancelSuccess = true;
    const next: any = clearPending(ctx);
    if (next.appointmentId && String(next.appointmentId) === booking.id) {
      next.appointmentId = null;
      next.appointmentStatus = "NONE";
    }
    return { handled: true, message: buildCancelSuccessMessage(booking), nextContext: next, telemetry: t };
  } catch (err: any) {
    t.bempCancelSuccess = false;
    t.cancelBookingError = err?.message ? String(err.message).slice(0, 200) : "unknown_error";
    logger.error("CANCEL_API_FAILED", "Falha na execução do cancelamento BEMP", { ...t, error: err.message, bookingId: booking.id });
    return { handled: true, message: CANCEL_FAILED_MESSAGE, nextContext: ctx, telemetry: t };
  }
}

export async function handleCancelFlow(params: {
  text: string;
  ctx: BookingContext;
  conversationUnitId: string | number | null | undefined;
  deps: CancelDeps;
  now?: Date;
}): Promise<CancelResult> {
  const { text, ctx, conversationUnitId, deps } = params;
  const now = params.now ?? new Date();
  const t = baseTelemetry();
  const anyCtx = ctx as any;

  // ---- Já existe um cancelamento aguardando confirmação/escolha ----
  if (anyCtx.pendingCancellation === true) {
    const options: BempBooking[] = Array.isArray(anyCtx.pendingCancellationOptions)
      ? anyCtx.pendingCancellationOptions
      : [];
    const selectedId: string | null = anyCtx.pendingCancellationBookingId ?? null;
    const selected = options.find((o) => o.id === selectedId) ?? null;

    if (isCancelAbort(text)) {
      return {
        handled: true,
        message: "Tudo bem 💜 Seu agendamento continua confirmado.",
        nextContext: clearPending(ctx),
        telemetry: t,
      };
    }

    if (selected && isCancelConfirmation(text)) {
      return runCancel(selected, conversationUnitId, ctx, deps, t);
    }

    if (!selected && options.length > 0) {
      const chosen = chooseBookingFromReply(text, options);
      if (chosen) {
        const next: any = { ...ctx, pendingCancellationBookingId: chosen.id };
        t.cancelConfirmationAsked = true;
        return {
          handled: true,
          message: buildSingleCancelConfirmation(chosen),
          nextContext: next,
          telemetry: t,
        };
      }
      t.multipleBookingsListed = true;
      return { handled: true, message: buildMultipleCancelList(options), nextContext: ctx, telemetry: t };
    }

    // Mensagem não relacionada ao cancelamento pendente: libera o fluxo normal.
    return { handled: false, nextContext: clearPending(ctx), telemetry: t };
  }

  // ---- Nova intenção de cancelamento ----
  if (!detectCancelIntent(text)) {
    return { handled: false, telemetry: t };
  }
  t.cancelIntent = true;

  // A) fluxo conversacional em andamento (ainda não criado na BEMP)
  if (hasBookingInProgress(ctx)) {
    t.transientBookingFound = true;
    return {
      handled: true,
      message: CANCEL_FLOW_MESSAGE,
      nextContext: clearPending(resetBookingForCancel(ctx)),
      telemetry: t,
    };
  }

  // B) consultar a BEMP — fonte da verdade
  t.bempLookupCalled = true;
  let bookings: BempBooking[] = [];
  try {
    const raw = await deps.listAppointments();
    bookings = filterFutureBookingsForUnit(raw, conversationUnitId, now);
  } catch (err: any) {
    t.cancelBookingError = err?.message ? String(err.message).slice(0, 200) : "lookup_failed";
    logger.error("CANCEL_LOOKUP_FAILED", "Falha na consulta BEMP", { ...t, error: err.message });
    return { handled: true, message: CANCEL_FAILED_MESSAGE, nextContext: ctx, telemetry: t };
  }
  t.futureBookingsFound = bookings.length;

  if (bookings.length === 0) {
    return { handled: true, message: NO_FUTURE_BOOKINGS_MESSAGE, nextContext: clearPending(ctx), telemetry: t };
  }

  if (bookings.length === 1) {
    const b = bookings[0]!;
    t.cancelConfirmationAsked = true;
    const next: any = {
      ...ctx,
      pendingCancellation: true,
      pendingCancellationBookingId: b.id,
      pendingCancellationOptions: bookings,
    };
    return { handled: true, message: buildSingleCancelConfirmation(b), nextContext: next, telemetry: t };
  }

  t.multipleBookingsListed = true;
  const next: any = {
    ...ctx,
    pendingCancellation: true,
    pendingCancellationBookingId: null,
    pendingCancellationOptions: bookings,
  };
  return { handled: true, message: buildMultipleCancelList(bookings), nextContext: next, telemetry: t };
}
