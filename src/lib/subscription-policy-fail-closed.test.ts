import { describe, it, expect, vi } from "vitest";
import { enforceNoCpfInSubscriptionFlow, PHONE_REQUEST_MESSAGE } from "./subscription-policy.server";

describe("Subscription Policy - Fail-Closed Tests", () => {
  it("deve bloquear CPF mesmo com contexto null", () => {
    const result = enforceNoCpfInSubscriptionFlow(
      "Para localizar seu plano, informe seu CPF (000.000.000-00).",
      null
    );
    expect(result.blocked).toBe(true);
    expect(result.text).toBe(PHONE_REQUEST_MESSAGE);
  });

  it("deve bloquear CPF mesmo com subscriptionIntent false", () => {
    const context = {
      subscriptionIntent: false
    };
    const result = enforceNoCpfInSubscriptionFlow(
      "Preciso realmente do seu CPF para localizar sua assinatura.",
      context as any
    );
    expect(result.blocked).toBe(true);
    expect(result.text).toBe(PHONE_REQUEST_MESSAGE);
  });

  it("não deve alterar mensagens não relacionadas ao CPF", () => {
    const text = "Seu agendamento foi confirmado para amanhã.";
    const result = enforceNoCpfInSubscriptionFlow(text, null);
    expect(result.blocked).toBe(false);
    expect(result.text).toBe(text);
  });
  
  it("não deve bloquear menção a documento recebido", () => {
    const text = "Documento recebido com sucesso.";
    const result = enforceNoCpfInSubscriptionFlow(text, null);
    expect(result.blocked).toBe(false);
    expect(result.text).toBe(text);
  });
});
