import { describe, it, expect } from "vitest";
import { getLocalBookingDate, addLocalDays, resolveRelativeDate } from "../local-date";
import { extractBookingSlots } from "../context";
import { buildConfirmationMessage } from "../lifecycle";
import { slotLocalDate, slotLocalTime } from "../slot-time";

// 2026-08-16 23:46 São Paulo = 2026-08-17 02:46 UTC
const NOW_2346 = new Date("2026-08-17T02:46:00.000Z");
const NOW_2359 = new Date("2026-08-17T02:59:00.000Z");

describe("datas locais America/Sao_Paulo", () => {
  it("A: 'amanhã' às 23:46 => 2026-08-17", () => {
    expect(getLocalBookingDate(NOW_2346)).toBe("2026-08-16");
    expect(resolveRelativeDate("amanhã", NOW_2346)).toBe("2026-08-17");
    expect(extractBookingSlots("amanhã", NOW_2346).date).toBe("2026-08-17");
  });

  it("B: 'amanhã' às 23:59 => 2026-08-17", () => {
    expect(extractBookingSlots("amanhã", NOW_2359).date).toBe("2026-08-17");
  });

  it("C: 'hoje' às 23:59 => 2026-08-16", () => {
    expect(extractBookingSlots("hoje", NOW_2359).date).toBe("2026-08-16");
  });

  it("D: 'amanhã de manhã' => data 17 e período manhã", () => {
    const out = extractBookingSlots("amanhã de manhã", NOW_2346);
    expect(out.date).toBe("2026-08-17");
    expect(out.period).toBe("manhã");
  });

  it("E: confirmação preserva data e hora do slot", () => {
    const slot = "2026-08-17T14:40:00.000-03:00";
    expect(slotLocalDate(slot)).toBe("2026-08-17");
    expect(slotLocalTime(slot)).toBe("14:40");
    const msg = buildConfirmationMessage({
      date: "2026-08-17",
      time: "14:40",
      serviceName: "Manicure",
      selectedSlot: slot,
    } as any);
    expect(msg).toContain("17/08/2026");
    expect(msg).toContain("14:40");
  });

  it("addLocalDays não cruza fuso", () => {
    expect(addLocalDays("2026-08-31", 1)).toBe("2026-09-01");
  });
});
