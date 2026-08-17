import { describe, it, expect } from "vitest";
import {
  extractBookingSlots,
  mergeBookingContext,
  nextRequiredSlot,
  matchProfessionalChoice,
  isAnyProfessionalChoice,
  isAnyProfessionalIndex,
  type BookingContext,
} from "../context";
import { resolveCreateDateTime } from "../create-guard";

const BEFORE_MIDNIGHT = new Date("2026-08-17T02:53:00.000Z"); // 2026-08-16 23:53 America/Sao_Paulo
const AFTER_MIDNIGHT = new Date("2026-08-17T03:01:00.000Z"); // 2026-08-17 00:01 America/Sao_Paulo

describe("TESTE A - data absoluta imutável na virada da meia-noite", () => {
  it('mantém 2026-08-17 mesmo confirmando após a meia-noite', () => {
    const first = extractBookingSlots("Amanhã", BEFORE_MIDNIGHT);
    expect(first.date).toBe("2026-08-17");
    expect(first.dateLocked).toBe(true);

    let ctx = mergeBookingContext({ unitId: "5258", serviceId: "1", serviceName: "MANICURE" }, first);
    ctx.professionalId = "10";
    ctx.professionalName = "Juliana";
    ctx.selectedSlot = "2026-08-17T14:40:00-03:00";
    ctx.time = "14:40";
    ctx.appointmentStatus = "AWAITING_CONFIRMATION";

    // "Sim" recebido após a meia-noite: nada de data na mensagem
    const confirm = extractBookingSlots("Sim", AFTER_MIDNIGHT, ctx);
    expect(confirm.date).toBeUndefined();
    ctx = mergeBookingContext(ctx, confirm);
    expect(ctx.date).toBe("2026-08-17");

    const res = resolveCreateDateTime(ctx);
    expect(res.ok).toBe(true);
    expect(res.date).toBe("2026-08-17");
    expect(res.start?.slice(0, 10)).toBe("2026-08-17");
    expect(res.time).toBe("14:40");
  });
});

describe("TESTE B - NEED_PROFESSIONAL", () => {
  it("pede profissional antes de listar horários", () => {
    const ctx: BookingContext = {
      unitId: "5258",
      serviceId: "1",
      serviceName: "MANICURE",
      date: "2026-08-17",
    };
    expect(nextRequiredSlot(ctx)).toBe("professional");
  });

  it("com preferência ANY segue para disponibilidade", () => {
    const ctx: BookingContext = {
      unitId: "5258",
      serviceId: "1",
      serviceName: "MANICURE",
      date: "2026-08-17",
      professionalPreference: "ANY",
    };
    expect(nextRequiredSlot(ctx)).toBe("availability");
  });
});

describe("TESTE C - profissional escolhido e preservado", () => {
  const options = [
    { id: "10", name: "Juliana Muller" },
    { id: "22", name: "Carla Souza" },
  ];

  it("resolve por índice, nome e primeiro nome", () => {
    expect(matchProfessionalChoice("2", options)?.id).toBe("22");
    expect(matchProfessionalChoice("Juliana", options)?.id).toBe("10");
    expect(matchProfessionalChoice("quero com a Carla", options)?.id).toBe("22");
  });

  it("aceita qualquer profissional", () => {
    expect(isAnyProfessionalChoice("tanto faz")).toBe(true);
    expect(isAnyProfessionalChoice("quem estiver disponível")).toBe(true);
    expect(isAnyProfessionalIndex("3", options)).toBe(true);
  });

  it("preserva professionalId no merge", () => {
    const prev: BookingContext = {
      unitId: "5258",
      serviceId: "1",
      serviceName: "MANICURE",
      date: "2026-08-17",
      bookingSessionId: "bs_1",
      professionalId: "10",
      professionalName: "Juliana Muller",
    };
    const next = mergeBookingContext(prev, extractBookingSlots("tarde", BEFORE_MIDNIGHT, prev));
    expect(next.professionalId).toBe("10");
    expect(next.professionalName).toBe("Juliana Muller");
    expect(nextRequiredSlot(next)).toBe("availability");
  });
});

describe("TESTE D/E - coerência entre data e slot", () => {
  const base: BookingContext = {
    unitId: "5258",
    serviceId: "1",
    serviceName: "MANICURE",
    date: "2026-08-17",
    time: "14:40",
  };

  it("D: slot do mesmo dia é aceito", () => {
    const res = resolveCreateDateTime({ ...base, selectedSlot: "2026-08-17T14:40:00-03:00" });
    expect(res.ok).toBe(true);
    expect(res.mismatch).toBe(false);
    expect(res.date).toBe("2026-08-17");
  });

  it("E: slot de outro dia bloqueia a criação", () => {
    const res = resolveCreateDateTime({ ...base, selectedSlot: "2026-08-18T14:40:00-03:00" });
    expect(res.ok).toBe(false);
    expect(res.mismatch).toBe(true);
    expect(res.start).toBeNull();
  });
});
