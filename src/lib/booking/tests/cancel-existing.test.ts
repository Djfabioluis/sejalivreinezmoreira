import { describe, it, expect, vi } from "vitest";
import { handleCancelFlow } from "../cancel-handler";
import type { BookingContext } from "../context";

const NOW = new Date("2026-08-17T12:00:00Z");
const UNIT = "5258";

const bookingA = {
  id: "9001",
  service_name: "Manicure",
  start: "2026-08-18T14:40:00-03:00",
  salon_id: 5258,
};
const bookingB = {
  id: "9002",
  service_name: "Pedicure",
  start: "2026-08-19T10:00:00-03:00",
  salon_id: 5258,
};

function emptyCtx(): BookingContext {
  return { unitId: UNIT };
}

describe("cancelamento de agendamento confirmado", () => {
  it("TESTE A — consulta BEMP e pede confirmação (sem cancelar)", async () => {
    const listAppointments = vi.fn().mockResolvedValue([bookingA]);
    const cancelAppointment = vi.fn();
    const res = await handleCancelFlow({
      text: "Cancelar",
      ctx: emptyCtx(),
      conversationUnitId: UNIT,
      deps: { listAppointments, cancelAppointment },
      now: NOW,
    });
    expect(res.handled).toBe(true);
    expect(res.telemetry.bempLookupCalled).toBe(true);
    expect(res.telemetry.futureBookingsFound).toBe(1);
    expect(res.telemetry.cancelConfirmationAsked).toBe(true);
    expect(cancelAppointment).not.toHaveBeenCalled();
    expect(res.message).toContain("Manicure");
    expect(res.message).toContain("18/08/2026");
    expect(res.message).toContain("14:40");
    expect(res.message).not.toContain("Não há nenhum agendamento em andamento");
    expect((res.nextContext as any).pendingCancellation).toBe(true);
    expect((res.nextContext as any).pendingCancellationBookingId).toBe("9001");
  });

  it("TESTE B — 'Sim' cancela exatamente uma vez", async () => {
    const listAppointments = vi.fn().mockResolvedValue([bookingA]);
    const cancelAppointment = vi.fn().mockResolvedValue({ ok: true });
    const first = await handleCancelFlow({
      text: "Cancelar",
      ctx: emptyCtx(),
      conversationUnitId: UNIT,
      deps: { listAppointments, cancelAppointment },
      now: NOW,
    });
    const res = await handleCancelFlow({
      text: "Sim",
      ctx: first.nextContext!,
      conversationUnitId: UNIT,
      deps: { listAppointments, cancelAppointment },
      now: NOW,
    });
    expect(res.telemetry.cancelBookingCalled).toBe(true);
    expect(res.telemetry.cancelBookingCallCount).toBe(1);
    expect(res.telemetry.bempCancelSuccess).toBe(true);
    expect(cancelAppointment).toHaveBeenCalledTimes(1);
    expect(cancelAppointment).toHaveBeenCalledWith("9001");
    expect(res.message).toContain("foi cancelado");
    expect((res.nextContext as any).pendingCancellation).toBe(false);
    expect((res.nextContext as any).pendingCancellationBookingId).toBeNull();
  });

  it("TESTE C — sem bookings futuros responde só depois de consultar", async () => {
    const listAppointments = vi.fn().mockResolvedValue([]);
    const res = await handleCancelFlow({
      text: "Cancelar",
      ctx: emptyCtx(),
      conversationUnitId: UNIT,
      deps: { listAppointments, cancelAppointment: vi.fn() },
      now: NOW,
    });
    expect(listAppointments).toHaveBeenCalledTimes(1);
    expect(res.message).toContain("Não encontrei agendamentos futuros");
  });

  it("TESTE D — múltiplos bookings são listados sem cancelar", async () => {
    const cancelAppointment = vi.fn();
    const res = await handleCancelFlow({
      text: "quero desmarcar",
      ctx: emptyCtx(),
      conversationUnitId: UNIT,
      deps: { listAppointments: vi.fn().mockResolvedValue([bookingA, bookingB]), cancelAppointment },
      now: NOW,
    });
    expect(res.telemetry.multipleBookingsListed).toBe(true);
    expect(cancelAppointment).not.toHaveBeenCalled();
    expect(res.message).toContain("1. Manicure");
    expect(res.message).toContain("2. Pedicure");
    expect((res.nextContext as any).pendingCancellationBookingId).toBeNull();
  });

  it("escolha por número pede confirmação do item certo", async () => {
    const deps = { listAppointments: vi.fn().mockResolvedValue([bookingA, bookingB]), cancelAppointment: vi.fn() };
    const first = await handleCancelFlow({ text: "cancelar", ctx: emptyCtx(), conversationUnitId: UNIT, deps, now: NOW });
    const second = await handleCancelFlow({ text: "2", ctx: first.nextContext!, conversationUnitId: UNIT, deps, now: NOW });
    expect((second.nextContext as any).pendingCancellationBookingId).toBe("9002");
    expect(second.message).toContain("Pedicure");
    expect(deps.cancelAppointment).not.toHaveBeenCalled();
  });

  it("proteção de unidade: booking de outra unidade não é encontrado", async () => {
    const res = await handleCancelFlow({
      text: "cancelar",
      ctx: emptyCtx(),
      conversationUnitId: UNIT,
      deps: { listAppointments: vi.fn().mockResolvedValue([{ ...bookingA, salon_id: 9999 }]), cancelAppointment: vi.fn() },
      now: NOW,
    });
    expect(res.telemetry.futureBookingsFound).toBe(0);
    expect(res.message).toContain("Não encontrei agendamentos futuros");
  });

  it("falha da BEMP não afirma cancelamento", async () => {
    const deps = {
      listAppointments: vi.fn().mockResolvedValue([bookingA]),
      cancelAppointment: vi.fn().mockRejectedValue(new Error("Bemp 500")),
    };
    const first = await handleCancelFlow({ text: "cancelar", ctx: emptyCtx(), conversationUnitId: UNIT, deps, now: NOW });
    const res = await handleCancelFlow({ text: "sim", ctx: first.nextContext!, conversationUnitId: UNIT, deps, now: NOW });
    expect(res.telemetry.bempCancelSuccess).toBe(false);
    expect(res.message).toContain("Não consegui concluir o cancelamento");
    expect(res.message).not.toContain("foi cancelado");
  });

  it("fluxo em andamento continua sendo apenas limpo, sem consultar BEMP", async () => {
    const listAppointments = vi.fn();
    const res = await handleCancelFlow({
      text: "cancelar",
      ctx: { unitId: UNIT, serviceName: "Manicure", date: "2026-08-18" },
      conversationUnitId: UNIT,
      deps: { listAppointments, cancelAppointment: vi.fn() },
      now: NOW,
    });
    expect(listAppointments).not.toHaveBeenCalled();
    expect(res.telemetry.transientBookingFound).toBe(true);
  });
});
