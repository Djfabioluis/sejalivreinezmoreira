import { describe, it, expect, vi, beforeEach } from "vitest";
import { enforceNoCpfInSubscriptionFlow, PHONE_REQUEST_MESSAGE, PHONE_RETRY_MESSAGE, HUMAN_HANDOFF_MESSAGE } from "./subscription-policy.server";
import { sendEvolutionText } from "./evolution.server";
import { logger } from "./observability/logger.server";

// Mock do Evolution API e Supabase
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock("./observability/logger.server", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock do fetch global para evoFetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  text: () => Promise.resolve(JSON.stringify({ status: "success" })),
});

describe("Subscription Protection - Final Audit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TEST 1 & 2: enforceNoCpfInSubscriptionFlow", () => {
    it("TEST 1: deve bloquear CPF mesmo com contexto null", () => {
      const result = enforceNoCpfInSubscriptionFlow(
        "Informe seu CPF para localizar seu plano.",
        null
      );
      expect(result.blocked).toBe(true);
      expect(result.text).toContain("telefone cadastrado");
      expect(result.text).not.toContain("CPF");
    });

    it("TEST 2: deve bloquear CPF mesmo com subscriptionIntent: false", () => {
      const result = enforceNoCpfInSubscriptionFlow(
        "Preciso realmente do seu CPF para verificar sua assinatura.",
        { subscriptionIntent: false } as any
      );
      expect(result.blocked).toBe(true);
      expect(result.text).toContain("telefone cadastrado");
    });
  });

  describe("TEST 3 & 10: sendEvolutionText Barrier", () => {
    it("TEST 3: deve aplicar proteção em sendEvolutionText mesmo se Supabase falhar", async () => {
      // Supabase mockado para falhar no beforeEach ou por padrão
      const body = "Para localizar seu plano preciso do seu CPF.";
      const sent = await sendEvolutionText("instancia-teste", "5511999999999", body);
      
      expect(sent).toBe(true);
      // O fetch deve ter sido chamado com o texto SEGURO
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const payload = JSON.parse(fetchCall[1].body as string);
      
      expect(payload.text).toContain("telefone cadastrado");
      expect(payload.text).not.toContain("CPF");
    });

    it("TEST 10: Evolution nunca deve receber texto com CPF", async () => {
      const body = "Informe seu CPF.";
      await sendEvolutionText("inst", "55119", body);
      
      const fetchCall = vi.mocked(global.fetch).mock.calls.find(c => c[0].includes("/message/sendText"));
      const payload = JSON.parse(fetchCall[1].body as string);
      expect(payload.text).not.toContain("CPF");
    });
  });

  describe("TEST 8 & 9: Multi-step lookup", () => {
    it("TEST 8: primeiro telefone não encontrado deve pedir novamente", () => {
      const context = { subscriptionLookupStage: "AWAITING_REGISTERED_PHONE", subscriptionPhoneAttempts: 1 };
      const result = enforceNoCpfInSubscriptionFlow("Informe seu CPF.", context as any);
      expect(result.text).toBe(PHONE_RETRY_MESSAGE);
      expect(result.text).not.toContain("CPF");
    });

    it("TEST 9: segundo telefone não encontrado deve disparar human handoff", () => {
      const context = { subscriptionLookupStage: "AWAITING_REGISTERED_PHONE_RETRY", subscriptionPhoneAttempts: 2 };
      const result = enforceNoCpfInSubscriptionFlow("Informe seu CPF.", context as any);
      expect(result.text).toBe(HUMAN_HANDOFF_MESSAGE);
      expect(result.text).not.toContain("CPF");
    });
  });
});
