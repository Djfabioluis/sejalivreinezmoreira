import { describe, expect, it } from "vitest";
import { canOverride, mergeCustomerMemory, computeConfidenceScore } from "@/lib/memory/merge";
import { maskSensitive, normalizeMemoryPhone, resolveOrgKey, isForbiddenMemoryValue } from "@/lib/memory/identity";
import { buildMemoryPromptBlock } from "@/lib/memory/prompt";

const baseMemory: any = {
  id: "m1",
  org_key: "org",
  phone_normalized: "5541999998888",
  contact_name: "Ana",
  preferred_name: "Ana",
  preferred_unit_id: "u1",
  preferred_services: ["Manicure"],
  preferred_professionals: [],
  preferred_days: [],
  preferred_times: [],
  restrictions: [],
  pending_topics: [],
  important_notes: [],
  communication_preferences: {},
  subscription_summary: {},
  appointment_summary: [],
  field_sources: {
    preferredName: { source: "bemp_confirmed", confidence: 1, updated_at: "2026-01-01T00:00:00Z" },
  },
  memory_summary: null,
  memory_version: 1,
  confidence_score: 0.8,
};

describe("memória: regras de confiança", () => {
  it("não deixa inferência sobrescrever dado confirmado", () => {
    expect(canOverride("bemp_confirmed", "inferred")).toBe(false);
  });

  it("permite confirmação sobrescrever inferência", () => {
    expect(canOverride("inferred", "bemp_confirmed")).toBe(true);
  });

  it("preserva nome confirmado diante de fato inferido", () => {
    const result = mergeCustomerMemory(baseMemory, {
      facts: [{ field: "preferredName", value: "Aninha", source: "inferred", confidence: 0.4 }],
    } as any);
    expect(result.patch["preferred_name"]).toBeUndefined();
  });

  it("acrescenta serviços novos sem duplicar", () => {
    const result = mergeCustomerMemory(baseMemory, {
      facts: [
        { field: "preferredServices", value: "manicure", source: "customer_stated", confidence: 0.9 },
        { field: "preferredServices", value: "Escova", source: "customer_stated", confidence: 0.9 },
      ],
    } as any);
    const services = (result.patch["preferred_services"] as string[]) ?? baseMemory.preferred_services;
    expect(services.filter((s) => s.toLowerCase() === "manicure")).toHaveLength(1);
    expect(services).toContain("Escova");
  });

  it("calcula score médio das origens", () => {
    const score = computeConfidenceScore({
      a: { source: "bemp_confirmed", confidence: 1, updated_at: "" } as any,
      b: { source: "inferred", confidence: 0.4, updated_at: "" } as any,
    });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("memória: privacidade e identidade", () => {
  it("normaliza telefone para apenas dígitos", () => {
    expect(normalizeMemoryPhone("+55 (41) 99999-8888@s.whatsapp.net")).toBe("5541999998888");
  });

  it("isola memórias por instância/organização", () => {
    expect(resolveOrgKey("salao-a")).not.toBe(resolveOrgKey("salao-b"));
  });

  it("mascara dados sensíveis", () => {
    const masked = maskSensitive("meu cpf é 123.456.789-09 e o cartão 4111 1111 1111 1111");
    expect(masked).not.toContain("123.456.789-09");
    expect(masked).not.toContain("4111 1111 1111 1111");
  });

  it("rejeita valores proibidos", () => {
    expect(isForbiddenMemoryValue("cartão 4111111111111111")).toBe(true);
    expect(isForbiddenMemoryValue("prefere manhã")).toBe(false);
  });
});

describe("memória: bloco de prompt", () => {
  it("retorna vazio sem memória", () => {
    expect(buildMemoryPromptBlock(null)).toBe("");
  });

  it("inclui apenas dados existentes", () => {
    const block = buildMemoryPromptBlock(baseMemory);
    expect(block).toContain("Manicure");
    expect(block).not.toContain("undefined");
  });
});
