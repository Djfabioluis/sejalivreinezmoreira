import { describe, it, expect } from "vitest";
import {
  classifyFailure,
  sanitizeErrorText,
  describeError,
  GENERIC_FALLBACK_TEXT,
} from "../failure";

describe("classifyFailure", () => {
  it("402 Payment Required → créditos esgotados, sem texto de instabilidade", () => {
    const f = classifyFailure(new Error("Payment Required"));
    expect(f.code).toBe("ai_credits_exhausted");
    expect(f.expected).toBe(true);
    expect(f.userMessage).not.toBe(GENERIC_FALLBACK_TEXT);
  });

  it("429 → rate limit sem escalar", () => {
    const f = classifyFailure(Object.assign(new Error("boom"), { status: 429 }));
    expect(f.code).toBe("ai_rate_limited");
    expect(f.escalate).toBe(false);
  });

  it("service_not_found → mensagem específica", () => {
    const f = classifyFailure(Object.assign(new Error("x"), { code: "service_not_found" }));
    expect(f.userMessage).toContain("Não encontrei esse serviço");
  });

  it("Bemp 404 e 422 têm códigos próprios", () => {
    expect(classifyFailure(new Error("Bemp 404: not found")).code).toBe("bemp_not_found");
    expect(classifyFailure(new Error("Bemp 422: invalid")).code).toBe("bemp_invalid_data");
  });

  it("erro desconhecido usa texto genérico", () => {
    const f = classifyFailure(new Error("kaboom"));
    expect(f.code).toBe("unexpected_error");
    expect(f.userMessage).toBe(GENERIC_FALLBACK_TEXT);
    expect(f.expected).toBe(false);
  });
});

describe("sanitizeErrorText", () => {
  it("mascara bearer tokens e chaves", () => {
    expect(sanitizeErrorText("Authorization: Bearer abcdef1234567890")).not.toContain(
      "abcdef1234567890",
    );
    expect(sanitizeErrorText("api_key=supersecretvalue123")).not.toContain("supersecretvalue123");
  });

  it("describeError devolve name/message/stack", () => {
    const info = describeError(new Error("falhou"));
    expect(info.name).toBe("Error");
    expect(info.message).toBe("falhou");
    expect(typeof info.stack).toBe("string");
  });
});
