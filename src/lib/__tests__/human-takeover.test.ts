import { describe, it, expect } from "vitest";
import { ensureAIAllowedToReply } from "@/lib/evolution/reply.server";

describe("Human mode removido do fluxo da IA", () => {
  const human = {
    attendance_mode: "HUMAN",
    human_takeover_detected: true,
    ai_paused_at: new Date().toISOString(),
    ai_pause_reason: "CUSTOMER_REQUESTED_HUMAN",
  };

  it("conversa antiga em HUMAN não bloqueia a IA", () => {
    expect(ensureAIAllowedToReply(human).allowed).toBe(true);
  });

  it("ai_paused_at antigo não bloqueia a IA", () => {
    expect(ensureAIAllowedToReply({ ai_paused_at: "2026-01-01T00:00:00Z" }).allowed).toBe(true);
  });

  it("conversa em AI continua permitida", () => {
    expect(ensureAIAllowedToReply({ attendance_mode: "AI", ai_paused_at: null }).allowed).toBe(true);
  });
});
