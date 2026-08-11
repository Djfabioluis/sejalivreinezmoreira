import { describe, it, expect } from "vitest";
import { detectHumanTakeoverIntent, HUMAN_TRANSFER_MESSAGE } from "@/lib/human-takeover";
import { ensureAIAllowedToReply } from "@/lib/evolution/reply.server";

describe("Transferência para humano (A-E)", () => {
  const yes = ["Quero falar com um humano.","Quero falar com atendente.","Quero falar com uma pessoa.","Chama a recepção.","Quero falar com alguém.","Me passa para um atendente.","Quero atendimento humano.","Posso falar com a equipe?","Chama uma atendente.","Não quero falar com robô.","Quero falar com uma pessoa de verdade."];

  it("A: detecta pedido e define mensagem única de transferência", () => {
    yes.forEach((t) => expect([t, detectHumanTakeoverIntent(t)]).toEqual([t, true]));
    expect(HUMAN_TRANSFER_MESSAGE).toContain("Vou transferir seu atendimento");
  });

  const human = { attendance_mode: "HUMAN", human_takeover_detected: true, ai_paused_at: new Date().toISOString(), ai_pause_reason: "CUSTOMER_REQUESTED_HUMAN" };

  it("B: 'Oi?' em modo humano não gera resposta", () => {
    expect(detectHumanTakeoverIntent("Oi?")).toBe(false);
    expect(ensureAIAllowedToReply(human).allowed).toBe(false);
  });

  it("C: 'Quero marcar amanhã' em modo humano é bloqueado no outbound", () => {
    expect(detectHumanTakeoverIntent("Quero marcar amanhã.")).toBe(false);
    expect(ensureAIAllowedToReply(human).allowed).toBe(false);
  });

  it("D: humano responde → IA continua pausada", () => {
    const afterHumanReply = { ...human, ai_pause_reason: "HUMAN_AGENT_REPLIED", last_human_message_at: new Date().toISOString() };
    expect(ensureAIAllowedToReply(afterHumanReply).allowed).toBe(false);
  });

  it("E: atendente encerra → IA volta", () => {
    const reactivated = { attendance_mode: "AI", human_takeover_detected: false, ai_paused_at: null, ai_pause_reason: null };
    expect(ensureAIAllowedToReply(reactivated).allowed).toBe(true);
  });
});
