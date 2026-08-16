import { describe, it, expect } from "vitest";
import {
  detectSubscriptionIntent,
  extractBookingSlots,
  mergeBookingContext,
  nextRequiredSlot,
  enforceNoSubscriptionFlow,
  isShortAffirmative,
} from "../context";

const NOW = new Date("2026-08-11T12:00:00.000Z");
const TOMORROW = "2026-08-12";

describe("subscriptionIntent", () => {
  it("ativa somente com menção explícita", () => {
    for (const t of [
      "Quero usar meu plano.",
      "Tenho plano de manicure.",
      "Sou assinante.",
      "Essa manicure é do meu plano.",
      "Quero usar meu benefício.",
      "Tenho Beauty Club.",
    ]) {
      expect(detectSubscriptionIntent(t), t).toBe(true);
    }
  });

  it("NÃO ativa em pedidos comuns", () => {
    for (const t of [
      "Quero manicure.",
      "Quero escova.",
      "Quero fazer pé e mão.",
      "Tem horário para manicure?",
      "Quero agendar amanhã.",
    ]) {
      expect(detectSubscriptionIntent(t), t).toBe(false);
    }
  });
});

describe("TESTE A — quero marcar manicure amanhã", () => {
  it("mantém serviço e data sem assinatura", () => {
    const extracted = extractBookingSlots("Quero marcar manicure amanhã.", NOW);
    const ctx = mergeBookingContext(
      { unitId: "1377" },
      { ...extracted, serviceName: "Manicure", serviceId: "10" },
    );
    expect(ctx.serviceName).toBe("Manicure");
    expect(ctx.date).toBe(TOMORROW);
    expect(ctx.subscriptionIntent).toBe(false);
    expect(nextRequiredSlot(ctx)).toBe("availability");
  });
});

describe("TESTE B — serviço persiste entre mensagens", () => {
  it("'Amanhã' não apaga Manicure", () => {
    let ctx = mergeBookingContext({ unitId: "1377" }, extractBookingSlots("Quero marcar um horário.", NOW));
    expect(nextRequiredSlot(ctx)).toBe("service");

    ctx = mergeBookingContext(ctx, { ...extractBookingSlots("Manicure", NOW), serviceName: "Manicure", serviceId: "10" });
    expect(nextRequiredSlot(ctx)).toBe("date");

    ctx = mergeBookingContext(ctx, extractBookingSlots("Amanhã", NOW));
    expect(ctx.serviceName).toBe("Manicure");
    expect(ctx.date).toBe(TOMORROW);
    expect(nextRequiredSlot(ctx)).not.toBe("service");
  });
});

describe("TESTE C — manicure usando meu plano", () => {
  it("ativa subscriptionIntent", () => {
    const ctx = mergeBookingContext(
      { unitId: "1377" },
      { ...extractBookingSlots("Quero fazer manicure usando meu plano.", NOW), serviceName: "Manicure" },
    );
    expect(ctx.subscriptionIntent).toBe(true);
    expect(enforceNoSubscriptionFlow("Qual o telefone cadastrado no plano?", ctx).blocked).toBe(false);
  });
});

describe("TESTE D — 'Manicure' puro não inicia assinatura", () => {
  it("bloqueia resposta com fluxo de assinatura", () => {
    const ctx = mergeBookingContext({ unitId: "1377" }, { serviceName: "Manicure" });
    expect(ctx.subscriptionIntent).toBe(false);
    const guarded = enforceNoSubscriptionFlow(
      "Você possui assinatura? Qual o telefone cadastrado no plano?",
      ctx,
    );
    expect(guarded.blocked).toBe(true);
    expect(guarded.text).not.toMatch(/telefone cadastrado/i);
    expect(guarded.text).toMatch(/dia/i);
  });
});

describe("TESTE E — confirmações curtas", () => {
  it("reconhece isso/sim/correto", () => {
    for (const t of ["Isso.", "sim", "Correto", "Exatamente"]) {
      expect(isShortAffirmative(t), t).toBe(true);
    }
    expect(isShortAffirmative("Quero manicure")).toBe(false);
  });
});
