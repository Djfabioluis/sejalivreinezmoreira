import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAgentFlow } from "../agent.server";
import * as chatServer from "@/lib/chat.server";
import * as loggerServer from "../logger.server";

// Mock das dependências
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: "agent-1", status: "ativo", unidade_id: "unit-1" },
      error: null
    })
  }
}));

vi.mock("../logger.server", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("@/lib/chat.server", () => ({
  runAgentWithLogging: vi.fn().mockResolvedValue(undefined),
  runAgent: vi.fn().mockResolvedValue(undefined)
}));

describe("agent.server.ts - runAgentFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve chamar runAgentWithLogging quando o agente é encontrado e ativo", async () => {
    const mockMsg = {
      instance: "test-instance",
      messageId: "msg-1",
      message: { conversionSource: "test", message: { conversation: "Olá" } },
      remoteJid: "5511999999999@s.whatsapp.net",
      pushName: "Test User",
      fromMe: false,
      timestamp: Date.now()
    } as any;

    await runAgentFlow(mockMsg);

    // Verifica se logEvent foi chamado para o fluxo do agente
    expect(loggerServer.logEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: "agent_unit_resolved",
      status: "success"
    }));

    // Verifica se runAgentWithLogging foi chamado corretamente
    expect(chatServer.runAgentWithLogging).toHaveBeenCalledTimes(1);
    expect(chatServer.runAgentWithLogging).toHaveBeenCalledWith(expect.objectContaining({
      instance: "test-instance",
      messageId: "msg-1",
      unidadeId: "unit-1"
    }));

    // CRITICAL: runAgent (versão antiga/incorreta) NÃO deve ser chamado
    expect(chatServer.runAgent).not.toHaveBeenCalled();
  });

  it("não deve chamar a IA se o agente estiver inativo", async () => {
    // Re-mock local para este teste
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    (supabaseAdmin.maybeSingle as any).mockResolvedValueOnce({
      data: { id: "agent-2", status: "inativo", unidade_id: "unit-2" },
      error: null
    });

    const mockMsg = {
      instance: "test-instance",
      messageId: "msg-2",
      message: { message: { conversation: "Olá" } },
      remoteJid: "5511999999999@s.whatsapp.net",
      fromMe: false
    } as any;

    await runAgentFlow(mockMsg);

    expect(chatServer.runAgentWithLogging).not.toHaveBeenCalled();
    expect(loggerServer.logEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: "agent_inactive"
    }));
  });
});
