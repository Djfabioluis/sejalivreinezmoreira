import { describe, it, expect } from "vitest";
import {
  enforceNoCpfInSubscriptionFlow,
  ALLOW_SUBSCRIPTION_CPF_FALLBACK,
  SUBSCRIPTION_MESSAGES,
  isBempTechnicalError,
} from "./subscription-policy.server";

describe("subscription policy", () => {
  it("mantém o fallback de CPF desativado", () => {
    expect(ALLOW_SUBSCRIPTION_CPF_FALLBACK).toBe(false);
  });

  it("bloqueia CPF no primeiro estágio", () => {
    const r = enforceNoCpfInSubscriptionFlow("Preciso do seu CPF para validar.", {
      subscriptionIntent: true,
      subscriptionLookupStage: "AWAITING_REGISTERED_PHONE",
    });
    expect(r.blocked).toBe(true);
    expect(r.text).toBe(SUBSCRIPTION_MESSAGES.ASK_PHONE);
  });

  it("bloqueia CPF no retry pedindo novamente o telefone", () => {
    const r = enforceNoCpfInSubscriptionFlow("Informe seu CPF (000.000.000-00).", {
      subscriptionIntent: true,
      subscriptionLookupStage: "AWAITING_REGISTERED_PHONE_RETRY",
      subscriptionPhoneAttempts: 1,
    });
    expect(r.text).toBe(SUBSCRIPTION_MESSAGES.RETRY_PHONE);
  });

  it("bloqueia CPF em handoff humano", () => {
    const r = enforceNoCpfInSubscriptionFlow("Envie o número do CPF.", {
      subscriptionIntent: true,
      subscriptionLookupStage: "HUMAN_HANDOFF",
      subscriptionPhoneAttempts: 2,
    });
    expect(r.text).toBe(SUBSCRIPTION_MESSAGES.HUMAN_HANDOFF);
  });

  it("não altera textos normais", () => {
    const r = enforceNoCpfInSubscriptionFlow("Temos horário às 14h 💜", {
      subscriptionIntent: true,
      subscriptionLookupStage: "AWAITING_REGISTERED_PHONE",
    });
    expect(r.blocked).toBe(false);
  });

  it("não interfere fora do fluxo de assinatura", () => {
    const r = enforceNoCpfInSubscriptionFlow("Preciso do seu CPF", { subscriptionIntent: false });
    expect(r.blocked).toBe(false);
  });

  it("classifica erros técnicos do BEMP", () => {
    expect(isBempTechnicalError("BEMP_TIMEOUT")).toBe(true);
    expect(isBempTechnicalError("CUSTOMER_NOT_FOUND")).toBe(false);
  });
});
