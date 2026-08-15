import { describe, it, expect } from "vitest";
import {
  extractBookingSlots,
  BookingContext
} from "../context";

const NOW = new Date("2026-08-15T12:00:00.000Z"); // Sábado

describe("Extração Determinística de Mão -> Manicure", () => {
  const testCases = [
    { input: "mão", service: "manicure", date: null },
    { input: "mao", service: "manicure", date: null },
    { input: "quero fazer mão hoje", service: "manicure", date: "2026-08-15" },
    { input: "quero fazer a mao hoje", service: "manicure", date: "2026-08-15" },
    { input: "quero fazer mao hoje", service: "manicure", date: "2026-08-15" },
    { input: "tem horário para mão hoje?", service: "manicure", date: "2026-08-15" },
    { input: "unha da mão", service: "manicure", date: null },
    { input: "fazer a mão", service: "manicure", date: null },
  ];

  it.each(testCases)('ENTRADA: "$input" | ESPERADO: $service | $date', ({ input, service, date }) => {
    const extracted = extractBookingSlots(input, NOW);
    
    expect(extracted.serviceText?.toLowerCase()).toBe(service);
    if (date) {
      expect(extracted.date).toBe(date);
    }
  });
});
