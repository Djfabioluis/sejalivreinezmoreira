import { describe, it, expect } from "vitest";
import {
  ALTERNATIVE_MENU_MESSAGE,
  alternativeReplyKey,
  buildPeriodQuestion,
  extractPeriodChoice,
  isAlternativeAffirmative,
  noSlotsMessage,
  parseAlternativeChoice,
} from "../no-slots";

describe("no-slots alternative choice", () => {
  it("detects affirmatives", () => {
    for (const t of ["sim", "quero", "pode", "ok", "Pode ser", "beleza"]) {
      expect(isAlternativeAffirmative(t)).toBe(true);
    }
    expect(isAlternativeAffirmative("não")).toBe(false);
    expect(isAlternativeAffirmative("manhã")).toBe(false);
  });

  it("parses the menu choice", () => {
    expect(parseAlternativeChoice("1")).toBe("period");
    expect(parseAlternativeChoice("2")).toBe("day");
    expect(parseAlternativeChoice("outro periodo")).toBe("period");
    expect(parseAlternativeChoice("outro dia")).toBe("day");
    expect(parseAlternativeChoice("sim")).toBeNull();
  });

  it("excludes the failed period from the question", () => {
    const q = buildPeriodQuestion(["manhã"]);
    expect(q).not.toContain("manhã");
    expect(q).toContain("tarde");
    expect(q).toContain("noite");
  });

  it("extracts a period stated directly", () => {
    expect(extractPeriodChoice("pode ser a tarde")).toBe("tarde");
    expect(extractPeriodChoice("manha")).toBe("manhã");
    expect(extractPeriodChoice("sim")).toBeNull();
  });

  it("blocks identical reply for the same state", () => {
    const a = alternativeReplyKey("MENU", ALTERNATIVE_MENU_MESSAGE);
    const b = alternativeReplyKey("MENU", ALTERNATIVE_MENU_MESSAGE);
    const c = alternativeReplyKey("AWAITING_PERIOD", ALTERNATIVE_MENU_MESSAGE);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it("keeps the no-slots message stable per period", () => {
    expect(noSlotsMessage("manhã")).toContain("manhã");
  });
});
