import { describe, it, expect } from "vitest";
import {
  detectCancelIntent,
  hasBookingInProgress,
  resetBookingForCancel,
  type BookingContext,
} from "../context";

describe("cancel intent", () => {
  it("reconhece variações", () => {
    for (const t of [
      "Cancelar",
      "cancela",
      "cancelamento",
      "quero cancelar",
      "cancelar agendamento",
      "desistir",
      "pare",
      "parar",
      "não quero mais",
      "nao quero mais",
    ]) {
      expect(detectCancelIntent(t), t).toBe(true);
    }
  });

  it("não dispara em pedidos normais", () => {
    for (const t of ["Oi", "Quero manicure", "Amanhã de manhã", "14:40", "sim"]) {
      expect(detectCancelIntent(t), t).toBe(false);
    }
  });

  it("TESTE A — NEED_SERVICE", () => {
    const ctx: BookingContext = { unitId: "5258" };
    expect(hasBookingInProgress(ctx)).toBe(false);
    const next = resetBookingForCancel(ctx);
    expect(next.serviceName).toBeNull();
    expect(next.appointmentStatus).toBe("NONE");
  });

  it("TESTE B — NEED_DATE limpa contexto", () => {
    const ctx: BookingContext = { unitId: "5258", serviceId: "10", serviceName: "Manicure" };
    expect(hasBookingInProgress(ctx)).toBe(true);
    const next = resetBookingForCancel(ctx);
    expect(next.serviceId).toBeNull();
    expect(next.date).toBeNull();
    expect(next.unitId).toBe("5258");
  });

  it("TESTE C — NEED_CONFIRMATION não cria booking", () => {
    const ctx: BookingContext = {
      unitId: "5258",
      serviceId: "10",
      date: "2026-08-18",
      time: "14:40",
      selectedSlot: "2026-08-18T14:40:00",
      awaitingConfirmation: true,
      appointmentStatus: "AWAITING_CONFIRMATION",
    };
    const next = resetBookingForCancel(ctx);
    expect(next.selectedSlot).toBeNull();
    expect(next.awaitingConfirmation).toBe(false);
    expect(next.customerConfirmed).toBe(false);
    expect(next.appointmentStatus).toBe("NONE");
  });

  it("TESTE D — nova sessão limpa após cancelamento", () => {
    const ctx: BookingContext = {
      unitId: "5258",
      serviceName: "Manicure",
      date: "2026-08-18",
      period: "afternoon",
      professionalId: "7",
      professionalName: "Ana",
      bookingSessionId: "bs_old",
    };
    const next = resetBookingForCancel(ctx);
    expect(next.professionalId).toBeNull();
    expect(next.professionalName).toBeNull();
    expect(next.period).toBeNull();
    expect(next.bookingSessionId).not.toBe("bs_old");
    expect(hasBookingInProgress(next)).toBe(false);
  });
});
