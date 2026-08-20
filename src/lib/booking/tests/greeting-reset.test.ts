import { describe, expect, it } from "vitest";
import {
  isGenericGreeting,
  hasActiveAwaitingFlow,
  resetBookingForGreeting,
  JULIA_INTRO_MESSAGE,
} from "../context";

const base: any = {
  unitId: "1378",
  serviceId: "10",
  serviceName: "Manicure",
  date: "2026-08-21",
  period: "manha",
  time: "14:40",
  selectedSlot: "2026-08-21T14:40:00",
  availableSlots: ["2026-08-21T14:40:00"],
  professionalId: "55",
  professionalName: "Juliana",
  appointmentStatus: "AWAITING_CONFIRMATION",
  awaitingConfirmation: true,
  confirmationSentFor: "2026-08-21T14:40",
};

describe("saudação e reset de contexto", () => {
  it("detecta saudações", () => {
    for (const g of ["oi", "Olá", "bom dia", "Boa tarde", "boa noite"]) {
      expect(isGenericGreeting(g)).toBe(true);
    }
    expect(isGenericGreeting("quero marcar manicure amanhã")).toBe(false);
  });

  it("contexto antigo (fluxo velho) é limpo", () => {
    const stale = { ...base, lastFlowActivityAt: Date.now() - 60 * 60 * 1000 };
    expect(hasActiveAwaitingFlow(stale)).toBe(false);
    const next: any = resetBookingForGreeting(stale);
    expect(next.serviceId).toBeNull();
    expect(next.serviceName).toBeNull();
    expect(next.professionalId).toBeNull();
    expect(next.date).toBeNull();
    expect(next.period).toBeNull();
    expect(next.time).toBeNull();
    expect(next.selectedSlot).toBeNull();
    expect(next.availableSlots).toEqual([]);
    expect(next.confirmationSentFor).toBeNull();
    expect(next.appointmentStatus).toBe("NONE");
    expect(next.unitId).toBe("1378");
  });

  it("fluxo ativo e recente é preservado", () => {
    const active = { ...base, lastFlowActivityAt: Date.now() - 60 * 1000 };
    expect(hasActiveAwaitingFlow(active)).toBe(true);
  });

  it("nova conversa recebe apresentação da Julia", () => {
    expect(JULIA_INTRO_MESSAGE).toContain("Eu sou a Julia");
    expect(hasActiveAwaitingFlow({ appointmentStatus: "NONE" } as any)).toBe(false);
  });
});
