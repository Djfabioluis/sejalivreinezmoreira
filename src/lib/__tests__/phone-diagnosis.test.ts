import { normalizeBrazilianPhone } from "../phone";

describe("Normalização de Telefone (Diagnóstico)", () => {
  it("deve aceitar números válidos com 11 dígitos", () => {
    const res = normalizeBrazilianPhone("41999102791");
    expect(res?.full).toBe("5541999102791");
    expect(res?.reason).toBeUndefined();
  });

  it("deve identificar erro de DDD inválido", () => {
    const res = normalizeBrazilianPhone("01999102791");
    expect(res?.reason).toBe("INVALID_AREA_CODE");
  });

  it("deve identificar erro de falta de DDD", () => {
    const res = normalizeBrazilianPhone("999102791");
    expect(res?.reason).toBe("MISSING_AREA_CODE");
  });

  it("deve identificar número muito curto", () => {
    const res = normalizeBrazilianPhone("4199");
    expect(res?.reason).toBe("INVALID_LENGTH_TOO_SHORT");
  });
});
