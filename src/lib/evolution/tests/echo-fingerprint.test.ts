import { describe, it, expect } from "vitest";
import {
  findEchoFingerprintMatch,
  normalizeEchoText,
  parseLogPayload,
} from "../echo-fingerprint";

const NOW = Date.parse("2026-08-12T18:00:00.000Z");

function log(payload: unknown, secondsAgo = 5) {
  return {
    created_at: new Date(NOW - secondsAgo * 1000).toISOString(),
    payload,
  };
}

describe("echo fingerprint", () => {
  it("normaliza texto removendo acentos e pontuação", () => {
    expect(normalizeEchoText("Olá, tudo bem?!")).toBe("ola tudo bem");
  });

  it("extrai payload em formato objeto e string JSON", () => {
    const obj = { to: "5541999999999", textSnippet: "oi" };
    expect(parseLogPayload(obj)).toEqual(obj);
    expect(parseLogPayload(JSON.stringify(obj))).toEqual(obj);
    expect(parseLogPayload("nao-json")).toBeNull();
    expect(parseLogPayload(null)).toBeNull();
  });

  it("correlaciona eco da IA (match) mesmo com snippet truncado", () => {
    const full = "Olá Fabio! Posso te ajudar a agendar seu horário na Unidade Centro hoje?";
    const match = findEchoFingerprintMatch({
      outboundText: full,
      phone: "5541999999999@s.whatsapp.net",
      now: NOW,
      logs: [
        log(
          JSON.stringify({
            to: "5541999999999",
            textSnippet: full.slice(0, 50) + "...",
          }),
        ),
      ],
    });
    expect(match).not.toBeNull();
  });

  it("não correlaciona texto diferente, telefone diferente ou fora da janela", () => {
    const base = { to: "5541999999999", textSnippet: "Olá, posso ajudar?" };

    expect(
      findEchoFingerprintMatch({
        outboundText: "Bom dia, vou verificar com a equipe",
        phone: "5541999999999",
        now: NOW,
        logs: [log(base)],
      }),
    ).toBeNull();

    expect(
      findEchoFingerprintMatch({
        outboundText: "Olá, posso ajudar?",
        phone: "5541888888888",
        now: NOW,
        logs: [log(base)],
      }),
    ).toBeNull();

    expect(
      findEchoFingerprintMatch({
        outboundText: "Olá, posso ajudar?",
        phone: "5541999999999",
        now: NOW,
        logs: [log(base, 600)],
      }),
    ).toBeNull();
  });
});
