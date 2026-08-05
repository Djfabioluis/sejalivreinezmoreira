import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/bemp.server", () => ({
  BEMP_WEBHOOK_BASE: "https://webhooks.test/webhooks",
  bempFetch: vi.fn(),
}));
vi.mock("@/lib/bemp/assignments.server", () => ({
  resolveServiceAssignment: vi.fn(),
}));

import { bempFetch } from "@/lib/bemp.server";
import { resolveServiceAssignment } from "@/lib/bemp/assignments.server";
import {
  SUBSCRIPTION_SERVICE_MAP,
  normalizeSubscriptionPlanName,
  detectSubscriptionPlanType,
  subscriptionServiceNameForPlan,
  getCustomerActivePlans,
  resolveSubscriptionService,
  subscriptionAppointmentKey,
  getIdempotentSubscriptionResult,
  rememberSubscriptionResult,
  clearSubscriptionIdempotencyCache,
} from "../subscriptions.server";

const phone = { phoneCountry: "55", phoneArea: "41", phoneNumber: "999999999" };

beforeEach(() => {
  vi.clearAllMocks();
  clearSubscriptionIdempotencyCache();
});

describe("normalização do nome do plano", () => {
  it("trata variações como equivalentes", () => {
    for (const v of ["Plano Manicure", "Manicure", "Plano de Manicure", "MANICURE"]) {
      expect(detectSubscriptionPlanType(v)).toBe("manicure");
    }
    expect(normalizeSubscriptionPlanName("  Plano   de  Hidratação ")).toBe("plano de hidratacao");
  });
});

describe("mapeamento obrigatório plano → serviço", () => {
  it("Teste 1 — plano de manicure → Manicure Plano Beauty", () => {
    expect(subscriptionServiceNameForPlan("Plano de Manicure")).toBe("Manicure Plano Beauty");
    expect(SUBSCRIPTION_SERVICE_MAP.manicure.serviceName).toBe("Manicure Plano Beauty");
  });
  it("Teste 2 — plano de escova → Escova Plano Beauty", () => {
    expect(subscriptionServiceNameForPlan("Plano Escova")).toBe("Escova Plano Beauty");
  });
  it("Teste 3 — hidratação e escova → Hidratação e Escova", () => {
    expect(subscriptionServiceNameForPlan("Plano de Hidratação e Escova")).toBe("Hidratação e Escova");
    expect(subscriptionServiceNameForPlan("hidratacao + escova")).toBe("Hidratação e Escova");
  });
});

describe("consulta de planos no BEMP", () => {
  it("Teste 4 — plano vencido não é ativo", async () => {
    (bempFetch as any).mockResolvedValue({
      subscriptions: [{ id: 1, name: "Plano Manicure", status: "active", valid_until: "2020-01-01" }],
    });
    const res = await getCustomerActivePlans(phone);
    expect(res.plans).toHaveLength(0);
    expect(res.inactivePlans[0]!.inactiveReason).toBe("expired");
  });

  it("Teste 5 — plano sem saldo não é ativo", async () => {
    (bempFetch as any).mockResolvedValue({
      subscriptions: [{ id: 2, name: "Plano Escova", status: "active", available_uses: 0 }],
    });
    const res = await getCustomerActivePlans(phone);
    expect(res.plans).toHaveLength(0);
    expect(res.inactivePlans[0]!.inactiveReason).toBe("no_balance");
  });

  it("ignora plano cancelado ou suspenso", async () => {
    (bempFetch as any).mockResolvedValue({
      subscriptions: [
        { id: 3, name: "Plano Manicure", status: "canceled" },
        { id: 4, name: "Plano Escova", status: "suspenso" },
      ],
    });
    const res = await getCustomerActivePlans(phone);
    expect(res.plans).toHaveLength(0);
    expect(res.inactivePlans).toHaveLength(2);
  });

  it("Teste 6 — mais de um plano ativo é retornado sem escolha automática", async () => {
    (bempFetch as any).mockResolvedValue({
      subscriptions: [
        { id: 5, name: "Plano Manicure", status: "active", available_uses: 2 },
        { id: 6, name: "Plano Escova", status: "active", available_uses: 1 },
      ],
    });
    const res = await getCustomerActivePlans(phone);
    expect(res.plans.map((p) => p.serviceName)).toEqual(["Manicure Plano Beauty", "Escova Plano Beauty"]);
  });

  it("cliente sem cadastro retorna found=false", async () => {
    (bempFetch as any).mockRejectedValue(new Error("404 not found"));
    const res = await getCustomerActivePlans(phone);
    expect(res.found).toBe(false);
  });
});

describe("resolução do serviço por unidade", () => {
  it("Teste 7 — resolve o service_id na unidade efetiva informada", async () => {
    (resolveServiceAssignment as any).mockResolvedValue({
      success: true,
      service: { id: 987, name: "Manicure Plano Beauty" },
    });
    const res = await resolveSubscriptionService({ planName: "Plano Manicure", effectiveUnitId: "22" });
    expect(resolveServiceAssignment).toHaveBeenCalledWith("22", "Manicure Plano Beauty");
    expect(res).toMatchObject({ success: true, planType: "manicure", serviceId: 987 });
  });

  it("Teste 8 — serviço indisponível na unidade não faz fallback para serviço comum", async () => {
    (resolveServiceAssignment as any).mockResolvedValue({ success: false, code: "service_not_found" });
    const res = await resolveSubscriptionService({ planName: "Plano Escova", effectiveUnitId: "33" });
    expect(res.success).toBe(false);
    expect((res as any).code).toBe("service_not_found");
    expect((res as any).serviceName).toBe("Escova Plano Beauty");
  });
});

describe("Teste 9 — idempotência da confirmação", () => {
  it("mesma chave devolve o resultado anterior", () => {
    const key = subscriptionAppointmentKey({
      conversationKey: "inst:5541999999999",
      messageId: "MSG1",
      planId: 5,
      serviceId: 987,
      start: "2026-08-10T13:00:00.000-03:00",
    });
    expect(getIdempotentSubscriptionResult(key)).toBeNull();
    rememberSubscriptionResult(key, { success: true, appointment_id: "A1" });
    expect(getIdempotentSubscriptionResult(key)).toEqual({ success: true, appointment_id: "A1" });
  });
});
