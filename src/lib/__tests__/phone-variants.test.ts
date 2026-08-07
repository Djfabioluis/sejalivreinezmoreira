import { describe, it, expect } from "vitest";
import { normalizeBrazilianPhone, getPhoneVariants } from "../phone";

describe("phone variants logic", () => {
  it("should generate 8-digit variant from 9-digit input", () => {
    const normalized = normalizeBrazilianPhone("41999999999");
    expect(normalized).not.toBeNull();
    if (normalized) {
      const variants = getPhoneVariants(normalized);
      expect(variants).toHaveLength(2);
      expect(variants[1].number).toBe("99999999");
      expect(variants[1].full).toBe("554199999999");
    }
  });

  it("should generate 9-digit variant from 8-digit input", () => {
    const normalized = normalizeBrazilianPhone("4188888888");
    expect(normalized).not.toBeNull();
    if (normalized) {
      const variants = getPhoneVariants(normalized);
      expect(variants).toHaveLength(2);
      expect(variants[1].number).toBe("988888888");
      expect(variants[1].full).toBe("5541988888888");
    }
  });
});
