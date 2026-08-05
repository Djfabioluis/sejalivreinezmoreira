import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/bemp.server", () => ({
  BEMP_WEBHOOK_BASE: "https://webhooks.test/webhooks",
  bempFetch: vi.fn(),
}));
vi.mock("@/lib/bemp/assignments.server", () => ({
  resolveServiceAssignment: vi.fn(),
}));

import { bempFetch } from "@/lib/bemp.server";
import { getCustomerByCPF } from "../subscriptions.server";
import { normalizeCPF, isValidCPF, maskCPF, extractCPFFromText } from "@/lib/cpf";

const VALID = "52998224725";

beforeEach(() => vi.clearAllMocks());

describe("validação de CPF", () => {
  it("normaliza pontuação e espaços", () => {
    expect(normalizeCPF(" 529.982.247-25 ")).toBe(VALID);
  });
  it("aceita CPF válido nos dois formatos", () => {
    expect(isValidCPF(VALID)).toBe(true);
    expect(isValidCPF("529.982.247-25")).toBe(true);
  });
  it("rejeita CPF inválido, curto e repetido", () => {
    expect(isValidCPF("12345678900")).toBe(false);
    expect(isValidCPF("123456789")).toBe(false);
    expect(isValidCPF("11111111111")).toBe(false);
  });
  it("mascara o CPF", () => {
    expect(maskCPF(VALID)).toBe("***.***.***-25");
    expect(maskCPF("abc")).toBe("***.***.***-**");
  });
  it("extrai CPF de texto livre", () => {
    expect(extractCPFFromText("meu cpf é 529.982.247-25 ok")).toBe(VALID);
    expect(extractCPFFromText("sem cpf aqui")).toBeNull();
  });
});

describe("getCustomerByCPF", () => {
  it("CPF válido + plano ativo", async () => {
    (bempFetch as any).mockResolvedValue({
      customer: {
        id: 10,
        name: "Ana",
        subscriptions: [
          { id: 1, name: "Plano Manicure", status: "active", available_uses: 3 },
        ],
      },
    });
    const res = await getCustomerByCPF("529.982.247-25");
    expect(res.found).toBe(true);
    if (!res.found) return;
    expect(res.customerId).toBe(10);
    expect(res.plans).toHaveLength(1);
    expect(res.plans[0]!.serviceName).toBe("Manicure Plano Beauty");
  });

  it("CPF válido + cliente sem plano", async () => {
    (bempFetch as any).mockResolvedValue({ customer: { id: 11, name: "Bia" } });
    const res = await getCustomerByCPF(VALID);
    expect(res.found).toBe(true);
    if (!res.found) return;
    expect(res.plans).toHaveLength(0);
    expect(res.inactivePlans).toHaveLength(0);
  });

  it("CPF inexistente no BEMP", async () => {
    (bempFetch as any).mockRejectedValue(new Error("404 not found"));
    const res = await getCustomerByCPF(VALID);
    expect(res.found).toBe(false);
  });

  it("cliente com dois planos ativos", async () => {
    (bempFetch as any).mockResolvedValue({
      customer: {
        id: 12,
        name: "Cris",
        subscriptions: [
          { id: 1, name: "Plano Manicure", status: "active" },
          { id: 2, name: "Plano Escova", status: "active" },
        ],
      },
    });
    const res = await getCustomerByCPF(VALID);
    expect(res.found).toBe(true);
    if (!res.found) return;
    expect(res.plans.map((p) => p.serviceName)).toEqual([
      "Manicure Plano Beauty",
      "Escova Plano Beauty",
    ]);
  });

  it("plano vencido, cancelado e sem saldo não ficam ativos", async () => {
    (bempFetch as any).mockResolvedValue({
      customer: {
        id: 13,
        subscriptions: [
          { id: 1, name: "Plano Manicure", status: "active", valid_until: "2020-01-01" },
          { id: 2, name: "Plano Escova", status: "canceled" },
          { id: 3, name: "Plano Hidratação e Escova", status: "active", available_uses: 0 },
        ],
      },
    });
    const res = await getCustomerByCPF(VALID);
    expect(res.found).toBe(true);
    if (!res.found) return;
    expect(res.plans).toHaveLength(0);
    expect(res.inactivePlans.map((p) => p.inactiveReason)).toEqual([
      "expired",
      "canceled_or_suspended",
      "no_balance",
    ]);
  });

  it("nunca loga o CPF completo", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    (bempFetch as any).mockResolvedValue({ customer: { id: 14, name: "Dani" } });
    await getCustomerByCPF(VALID);
    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).not.toContain(VALID);
    expect(logged).toContain("***.***.***-25");
    spy.mockRestore();
  });
});
