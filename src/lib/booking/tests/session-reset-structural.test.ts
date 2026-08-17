import { expect, test } from "vitest";
import { extractBookingSlots, BookingContext } from "../context";

test("deve limpar contexto antigo quando detecta nova intenção de booking", () => {
  const previousContext: BookingContext = {
    appointmentStatus: "CONFIRMED",
    serviceId: "123",
    serviceName: "MANICURE ANTIGA",
    date: "2026-08-10",
    time: "10:00",
    selectedSlot: "2026-08-10T10:00:00Z",
    awaitingConfirmation: false,
    unitId: "5258"
  };

  const text = "quero fazer manicure hoje a noite";
  const now = new Date("2026-08-17T15:00:00Z");
  
  const extracted = extractBookingSlots(text, now, previousContext);

  expect(extracted.appointmentStatus).toBe("NONE");
  expect(extracted.serviceText).toBe("manicure");
  expect(extracted.date).toBe("2026-08-17");
  expect(extracted.selectedSlot).toBeNull();
  expect(extracted.serviceId).toBeNull();
  // Deve preservar o unitId
  expect(extracted.unitId).toBe("5258");
});

test("não deve limpar se for apenas uma mensagem de confirmação 'sim'", () => {
  const previousContext: BookingContext = {
    appointmentStatus: "AWAITING_CONFIRMATION",
    serviceId: "123",
    serviceName: "MANICURE",
    date: "2026-08-17",
    time: "20:00",
    selectedSlot: "2026-08-17T20:00:00Z",
    awaitingConfirmation: true
  };

  const text = "sim";
  const now = new Date("2026-08-17T15:00:00Z");
  
  const extracted = extractBookingSlots(text, now, previousContext);

  // Não deve resetar se não houver padrão de serviço explícito + verbo de intenção
  expect(extracted.appointmentStatus).not.toBe("NONE");
  expect(extracted._isReset).toBeUndefined();
});
