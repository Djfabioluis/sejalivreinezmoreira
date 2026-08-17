import { describe, it, expect } from "vitest";
import { extractBookingSlots, mergeBookingContext, nextRequiredSlot } from "../context";

describe("BUG_REAL: Seleção de Horário 'as 18'", () => {
  const NOW = new Date("2026-08-17T17:39:00Z");
  
  const previousContext = {
    unitId: "5258",
    serviceId: "18604",
    serviceName: "MANICURE",
    date: "2026-08-17",
    dateLocked: true,
    professionalId: "29461",
    professionalName: "Juliana Muller",
    period: "noite",
    availableSlots: [
      "2026-08-17T18:00:00.000-03:00",
      "2026-08-17T20:00:00.000-03:00",
      "2026-08-17T20:40:00.000-03:00",
      "2026-08-17T21:20:00.000-03:00"
    ],
    bookingSessionId: "bs_1786987892845_oj49tm",
    appointmentStatus: "NONE"
  } as any;

  it("deve extrair 18:00 de 'as 18' e encontrar match no slot real", () => {
    const extracted = extractBookingSlots("as 18", NOW, previousContext);
    
    // Verificações do Parser
    expect(extracted.time).toBe("18:00");
    expect(extracted.selectedSlot).toBe("2026-08-17T18:00:00.000-03:00");
    
    // Verificações do Merge e State Machine
    const next = mergeBookingContext(previousContext, extracted);
    expect(next.selectedSlot).toBe("2026-08-17T18:00:00.000-03:00");
    expect(nextRequiredSlot(next)).toBe("confirmation");
  });

  it("deve extrair 20:00 de '20' e encontrar match", () => {
    const extracted = extractBookingSlots("20", NOW, previousContext);
    expect(extracted.time).toBe("20:00");
    expect(extracted.selectedSlot).toBe("2026-08-17T20:00:00.000-03:00");
  });

  it("deve extrair 20:40 de '20:40'", () => {
    const extracted = extractBookingSlots("20:40", NOW, previousContext);
    expect(extracted.time).toBe("20:40");
    expect(extracted.selectedSlot).toBe("2026-08-17T20:40:00.000-03:00");
  });

  it("não deve dar match em '19' se não existir no catálogo", () => {
    const extracted = extractBookingSlots("19", NOW, previousContext);
    expect(extracted.time).toBe("19:00");
    expect(extracted.selectedSlot).toBeUndefined(); // slot não existe
  });
});
