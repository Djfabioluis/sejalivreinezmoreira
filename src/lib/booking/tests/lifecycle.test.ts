import { describe, it, expect } from "vitest";
import { 
  extractBookingSlots, 
  mergeBookingContext, 
  nextRequiredSlot, 
  ensureNoDuplicateBookingQuestion,
  isShortAffirmative,
  BookingContext
} from "../context";

describe("Booking Context Lifecycle", () => {
  it("should extract basic slots", () => {
    const text = "Quero manicure amanhã às 15:30";
    const slots = extractBookingSlots(text, new Date("2026-08-13T10:00:00Z"));
    expect(slots.serviceText).toBe("manicure");
    expect(slots.date).toBe("2026-08-14");
    expect(slots.time).toBe("15:30");
  });

  it("should merge context correctly", () => {
    const prev: BookingContext = { serviceName: "MANICURE" };
    const extracted = { date: "2026-08-14" };
    const merged = mergeBookingContext(prev, extracted);
    expect(merged.serviceName).toBe("MANICURE");
    expect(merged.date).toBe("2026-08-14");
  });

  it("should identify next required slot based on deterministic rules", () => {
    const ctx: BookingContext = { unitId: "123" };
    expect(nextRequiredSlot(ctx)).toBe("service");
    
    ctx.serviceName = "MANICURE";
    expect(nextRequiredSlot(ctx)).toBe("date");
    
    ctx.date = "2026-08-14";
    expect(nextRequiredSlot(ctx)).toBe("availability");
    
    ctx.selectedSlot = "15:30";
    expect(nextRequiredSlot(ctx)).toBe("confirmation");
    
    ctx.customerConfirmed = true;
    expect(nextRequiredSlot(ctx)).toBe("create_appointment");

    ctx.appointmentStatus = "CONFIRMED";
    expect(nextRequiredSlot(ctx)).toBe("completed");
  });

  it("should detect short affirmatives", () => {
    expect(isShortAffirmative("sim")).toBe(true);
    expect(isShortAffirmative("isso")).toBe(true);
    expect(isShortAffirmative("correto")).toBe(true);
    expect(isShortAffirmative("pode marcar")).toBe(true); // included in AFFIRMATIVE regex
  });

  it("should block duplicate questions", () => {
    const ctx: BookingContext = { serviceName: "MANICURE", date: "2026-08-14" };
    const question = "Qual serviço você deseja e qual o dia?";
    const { text, blocked } = ensureNoDuplicateBookingQuestion(question, ctx);
    expect(blocked).toBe(true);
    expect(text).toContain("agendamento"); // Fallback "confirmation" status because service/date are set
  });
});
