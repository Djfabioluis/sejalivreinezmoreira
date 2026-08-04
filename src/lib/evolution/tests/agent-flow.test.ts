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
    maybeSingle: vi.fn()
  }
}));

vi.mock("../logger.server", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined)
}));

// Mock do chat.server
vi.mock("@/lib/chat.server", () => ({
  runAgentWithLogging: vi.fn().mockResolvedValue(undefined),
  runAgent: vi.fn().mockResolvedValue(undefined)
}));

describe("agent.server.ts - runAgentFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve chamar runAgentWithLogging quando o agente é encontrado e ativo", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    (supabaseAdmin.maybeSingle as any).mockResolvedValue({
      data: { id: "agent-1", status: "ativo", unidade_id: "unit-1" },
      error: null
    });

    const mockMsg = {
      instance: "test-instance",
      messageId: "msg-1",
      message: { 
        conversation: "Olá Julia"
      },
      remoteJid: "5511999999999@s.whatsapp.net",
      pushName: "Test User",
      fromMe: false,
      timestamp: Date.now()
    } as any;

    await runAgentFlow(mockMsg);

    // Verifica se logEvent foi chamado indicando sucesso
    expect(loggerServer.logEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: "agent_unit_resolved",
      status: "success"
    }));

    // Verifica se runAgentWithLogging foi chamado corretamente
    expect(chatServer.runAgentWithLogging).toHaveBeenCalled();
    
    // CRITICAL: runAgent (versão antiga/incorreta) NÃO deve ser chamado
    expect(chatServer.runAgent).not.toHaveBeenCalled();
  });

  it("não deve chamar a IA se o agente estiver inativo", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    (supabaseAdmin.maybeSingle as any).mockResolvedValue({
      data: { id: "agent-2", status: "inativo", unidade_id: "unit-2" },
      error: null
    });

    const mockMsg = {
      instance: "test-instance",
      messageId: "msg-2",
      message: { conversation: "Olá" },
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
