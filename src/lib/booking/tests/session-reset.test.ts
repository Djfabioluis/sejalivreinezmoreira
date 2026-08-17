import { describe, it, expect } from "vitest";
import {
  extractBookingSlots,
  mergeBookingContext,
  hasCurrentSessionPeriod,
  type BookingContext,
} from "../context";

describe("TESTE A - mao sem acento", () => {
  it("normaliza variações para manicure", () => {
    for (const input of ["mão", "mao", "Mão", "Mao", "MÃO", "MAO", "quero fazer mao", "quero fazer mao hoje", "fazer mao", "mao amanhã"]) {
      expect(extractBookingSlots(input).serviceText).toBe("manicure");
    }
  });
});

describe("TESTE B - period antigo nunca atravessa", () => {
  it("não reutiliza period/slots antigos em novo booking", () => {
    const old: BookingContext = {
      unitId: "5258",
      serviceId: "111",
      serviceName: "Escova",
      period: "manhã",
      periodSessionId: "bs_old",
      bookingSessionId: "bs_old",
      time: "09:00",
      selectedSlot: "2026-08-01T09:00:00",
      availableSlots: ["2026-08-01T09:00:00"],
    };

    let ctx = mergeBookingContext(old, extractBookingSlots("Mao", new Date(), old));
    expect(ctx.period).toBeNull();
    expect(ctx.selectedSlot).toBeNull();
    expect(ctx.availableSlots).toEqual([]);
    expect(hasCurrentSessionPeriod(ctx)).toBe(false);

    ctx = mergeBookingContext(ctx, extractBookingSlots("Amanhã", new Date(), ctx));
    expect(ctx.date).toBeTruthy();
    expect(ctx.period).toBeNull();
    expect(hasCurrentSessionPeriod(ctx)).toBe(false);
  });
});

describe("TESTE C - period informado na sessão atual", () => {
  it("aceita tarde e libera list_slots", () => {
    let ctx: BookingContext = {
      unitId: "5258",
      bookingSessionId: "bs_new",
      serviceId: "222",
      serviceName: "Manicure",
      date: "2026-08-18",
    };
    ctx = mergeBookingContext(ctx, extractBookingSlots("tarde", new Date(), ctx));
    expect(ctx.period).toBe("tarde");
    expect(hasCurrentSessionPeriod(ctx)).toBe(true);
  });
});
