
import { describe, it, expect } from "vitest";
import { normalizeServiceSearchText, SERVICE_CATEGORY_ALIASES } from "./service-utils";

describe("Service Identification", () => {
  it("should normalize service search text correctly", () => {
    expect(normalizeServiceSearchText("Pacote de Mechas")).toBe("pacote de mechas");
    expect(normalizeServiceSearchText("MECHAS")).toBe("mechas");
    expect(normalizeServiceSearchText("Morena Iluminada!")).toBe("morena iluminada");
    expect(normalizeServiceSearchText("Vovô é pé-de-meia.")).toBe("vovo e pedemeia");
  });

  it("should identify mechas related aliases", () => {
    const mechaAliases = SERVICE_CATEGORY_ALIASES.MECHAS.map(a => normalizeServiceSearchText(a));
    
    expect(mechaAliases).toContain("mechas");
    expect(mechaAliases).toContain("luzes");
    expect(mechaAliases).toContain("morena iluminada");
    expect(mechaAliases).toContain("pacote de mechas");
  });

  it("should recognize intention correctly", () => {
    const input = normalizeServiceSearchText("Quero fazer luzes");
    const isMechas = SERVICE_CATEGORY_ALIASES.MECHAS.some(alias => 
      input.includes(normalizeServiceSearchText(alias))
    );
    expect(isMechas).toBe(true);
  });
});
