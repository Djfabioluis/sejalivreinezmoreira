import { describe, it, expect } from "vitest";
import { extractBookingSlots, mergeBookingContext, nextRequiredSlot, isShortAffirmative, BookingContext } from "../context";
import { buildConfirmationMessage, buildPendingConfirmationReminder } from "../lifecycle";
import { slotLocalTime } from "../slot-time";

const SLOTS = [
  "2026-08-17T12:00:00.000-03:00",
  "2026-08-17T14:40:00.000-03:00",
  "2026-08-17T17:20:00.000-03:00",
];

describe("slot selecionado -> confirmação", () => {
  const base: BookingContext = {
    unitId: "5258",
    serviceId: "111",
    serviceName: "Manicure",
    date: "2026-08-17",
    period: "tarde",
    availableSlots: SLOTS,
    bookingSessionId: "bs_test",
    periodSessionId: "bs_test",
  };

  it("detecta 14:40 e casa com o slot real da BEMP", () => {
    const extracted = extractBookingSlots("14:40", new Date("2026-08-16T22:00:00Z"), base);
    expect(extracted.time).toBe("14:40");
    expect(extracted.selectedSlot).toBe("2026-08-17T14:40:00.000-03:00");
    expect(slotLocalTime(extracted.selectedSlot)).toBe("14:40");
  });

  it("mantém contexto e vai para confirmação", () => {
    const merged = mergeBookingContext(base, extractBookingSlots("14:40", new Date("2026-08-16T22:00:00Z"), base));
    expect(merged.serviceId).toBe("111");
    expect(merged.date).toBe("2026-08-17");
    expect(merged.availableSlots?.length).toBe(3);
    expect(merged.selectedSlot).toBe("2026-08-17T14:40:00.000-03:00");
    expect(nextRequiredSlot(merged)).toBe("confirmation");
    expect(merged.appointmentStatus).not.toBe("CONFIRMED");
  });

  it("gera mensagem de confirmação com dados reais", () => {
    const ctx = { ...base, time: "14:40", selectedSlot: SLOTS[1] };
    const msg = buildConfirmationMessage(ctx);
    expect(msg).toContain("Manicure");
    expect(msg).toContain("17/08/2026");
    expect(msg).toContain("14:40");
    expect(msg).not.toContain("T14:40:00");
  });

  it("responde a '?' com lembrete de confirmação", () => {
    const ctx = { ...base, time: "14:40", selectedSlot: SLOTS[1] };
    expect(isShortAffirmative("?")).toBe(false);
    const msg = buildPendingConfirmationReminder(ctx);
    expect(msg).toContain("14:40");
    expect(msg.length).toBeGreaterThan(10);
  });

  it("'sim' é reconhecido como confirmação", () => {
    expect(isShortAffirmative("sim")).toBe(true);
    expect(isShortAffirmative("pode confirmar")).toBe(true);
  });
});
