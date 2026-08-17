import { describe, it, expect } from "vitest";
import { isGenericGreeting, clearTransientBooking } from "../context";
import { filterSlotsByPeriod, formatSlotsForDisplay, slotLocalTime, findSlotByTime } from "../slot-time";

const SLOTS = [
  "2026-08-17T12:40:00.000-03:00",
  "2026-08-17T14:40:00.000-03:00",
  "2026-08-17T15:20:00.000-03:00",
  "2026-08-17T16:00:00.000-03:00",
  "2026-08-17T19:20:00.000-03:00",
  "2026-08-17T20:00:00.000-03:00",
  "2026-08-17T20:40:00.000-03:00",
  "2026-08-17T21:20:00.000-03:00",
];

describe("TESTE 1 - contexto antigo não continua em saudação", () => {
  it("detecta saudações genéricas", () => {
    for (const g of ["Oi", "olá", "ola", "bom dia", "Boa tarde", "boa noite"]) {
      expect(isGenericGreeting(g)).toBe(true);
    }
    expect(isGenericGreeting("Quero fazer mão hoje")).toBe(false);
  });

  it("limpa campos transitórios preservando unidade", () => {
    const ctx = clearTransientBooking({
      unitId: "5258",
      serviceId: "1",
      date: "2026-08-17",
      period: "noite",
      availableSlots: SLOTS,
      conversationGreeted: true,
    } as any);
    expect(ctx.unitId).toBe("5258");
    expect(ctx.period).toBeNull();
    expect(ctx.serviceId).toBeNull();
    expect(ctx.availableSlots).toEqual([]);
    expect(ctx.selectedSlot).toBeNull();
    expect(ctx.clarificationRequired).toBe(false);
  });
});

describe("TESTE 2/3 - filtro de período", () => {
  it("noite", () => {
    expect(formatSlotsForDisplay(filterSlotsByPeriod(SLOTS, "noite"))).toEqual([
      "19:20",
      "20:00",
      "20:40",
      "21:20",
    ]);
  });
  it("tarde", () => {
    expect(formatSlotsForDisplay(filterSlotsByPeriod(SLOTS, "tarde"))).toEqual([
      "12:40",
      "14:40",
      "15:20",
      "16:00",
    ]);
  });
});

describe("TESTE 4 - display HH:mm e slot real preservado", () => {
  it("formata e recupera o slot original", () => {
    expect(slotLocalTime("2026-08-17T20:40:00.000-03:00")).toBe("20:40");
    expect(findSlotByTime(SLOTS, "20:40")).toBe("2026-08-17T20:40:00.000-03:00");
  });
});
