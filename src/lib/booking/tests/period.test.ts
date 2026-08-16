import { describe, it, expect } from "vitest";
import { extractBookingSlots, nextRequiredSlot, BookingContext } from "../context";

describe("Booking Context - Period Extraction & Flow", () => {
  const now = new Date("2026-08-16T12:00:00Z");

  it("should extract period 'tarde' from various inputs", () => {
    const inputs = ["tarde", "a tarde", "à tarde", "de tarde", "pela tarde"];
    inputs.forEach(input => {
      const slots = extractBookingSlots(input, now);
      expect(slots.period).toBe("tarde");
    });
  });

  it("should extract period 'manhã' and 'noite'", () => {
    expect(extractBookingSlots("manhã", now).period).toBe("manhã");
    expect(extractBookingSlots("de manhã", now).period).toBe("manhã");
    expect(extractBookingSlots("noite", now).period).toBe("noite");
    expect(extractBookingSlots("à noite", now).period).toBe("noite");
  });

  it("should determine nextRequiredSlot is 'availability' even if period is set (current state)", () => {
    const ctx: BookingContext = {
      unitId: "5258",
      serviceId: "serv-123",
      serviceName: "Manicure",
      date: "2026-08-16",
      period: "tarde",
      time: null,
      selectedSlot: null
    };
    
    // ATENÇÃO: O teste abaixo documenta o comportamento ATUAL (falho)
    // Onde mesmo com period, ele ainda retorna 'availability'
    expect(nextRequiredSlot(ctx)).toBe("availability");
  });
});
