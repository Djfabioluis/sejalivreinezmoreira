import { describe, it, expect } from "vitest";
import { normalizeBrazilianPhone } from "./phone";

describe("normalizeBrazilianPhone", () => {
  it("deve normalizar formato com parênteses e traço", () => {
    const res = normalizeBrazilianPhone("(41) 99999-9999");
    expect(res).toEqual({
      countryCode: "55",
      areaCode: "41",
      number: "999999999",
      full: "5541999999999"
    });
  });

  it("deve normalizar formato simples com 11 dígitos", () => {
    const res = normalizeBrazilianPhone("41999999999");
    expect(res?.full).toBe("5541999999999");
  });

  it("deve normalizar formato com +55", () => {
    const res = normalizeBrazilianPhone("+55 41 99999-9999");
    expect(res?.full).toBe("5541999999999");
  });

  it("deve normalizar formato 55 sem +", () => {
    const res = normalizeBrazilianPhone("5541999999999");
    expect(res?.full).toBe("5541999999999");
  });

  it("deve retornar null para telefone inválido (muito curto)", () => {
    const res = normalizeBrazilianPhone("41999");
    expect(res).toBeNull();
  });

  it("deve retornar null para DDD inválido", () => {
    const res = normalizeBrazilianPhone("01999999999");
    expect(res).toBeNull();
  });
});
