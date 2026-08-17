import { describe, it, expect } from "vitest";
import { isShortAffirmative, clearTransientBooking } from "../context";
import { formatBookingDate } from "../lifecycle";

describe("confirmação final", () => {
  it("detecta variações afirmativas", () => {
    for (const t of ["Sim", "sim", "SIM", "confirmo", "pode confirmar", "pode", "ok", "pode agendar", "Sim, por favor"]) {
      expect(isShortAffirmative(t)).toBe(true);
    }
    expect(isShortAffirmative("quero remarcar amanhã")).toBe(false);
  });

  it("mantém data 17/08/2026 e horário 14:40 na resposta final", () => {
    expect(formatBookingDate("2026-08-17")).toBe("17/08/2026");
  });

  it("limpa somente campos transitórios após sucesso", () => {
    const ctx: any = {
      unitId: "5258",
      serviceId: "10",
      serviceName: "Manicure",
      date: "2026-08-17",
      period: "tarde",
      time: "14:40",
      selectedSlot: "2026-08-17T14:40:00.000-03:00",
      availableSlots: ["2026-08-17T14:40:00.000-03:00"],
    };
    const cleared: any = clearTransientBooking(ctx);
    expect(cleared.unitId).toBe("5258");
    expect(cleared.date ?? null).toBeNull();
    expect(cleared.time ?? null).toBeNull();
    expect(cleared.selectedSlot ?? null).toBeNull();
  });
});
