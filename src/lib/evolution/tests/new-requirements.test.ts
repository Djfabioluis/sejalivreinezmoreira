import { describe, it, expect, vi, beforeEach } from "vitest";
import { processMessagesUpsert } from "../processor.server";
import * as chatServer from "@/lib/chat.server";
import * as loggerServer from "../logger.server";

// Mock das dependências
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    maybeSingle: vi.fn()
  }
}));

vi.mock("../logger.server", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("@/lib/chat.server", () => ({
  runAgentWithLogging: vi.fn().mockResolvedValue(undefined),
  mandatoryOperationalRules: vi.fn().mockReturnValue("Regras"),
  assembleSystemPrompt: vi.fn().mockReturnValue("Prompt")
}));

// Mock do import dinâmico em processor.server
vi.mock("../conversation.server", () => ({
  updateConversationMetadata: vi.fn().mockResolvedValue(undefined),
  appendIncomingMessage: vi.fn().mockResolvedValue(true)
}));

describe("Evolution Flow - Novos Requisitos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não processa mensagens fromMe", async () => {
    const payload = {
      instance: "test",
      data: {
        key: { remoteJid: "123@s.whatsapp.net", id: "m1", fromMe: true },
        message: { conversation: "Olá" }
      }
    };
    await processMessagesUpsert(payload, "http://loc/api");
    expect(loggerServer.logEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: "from_me_ignored"
    }));
  });

  it("ignora grupos", async () => {
    const payload = {
      instance: "test",
      data: {
        key: { remoteJid: "123456@g.us", id: "m2", fromMe: false },
        message: { conversation: "Olá" }
      }
    };
    await processMessagesUpsert(payload, "http://loc/api");
    expect(loggerServer.logEvent).toHaveBeenCalledWith(expect.objectContaining({
      event: "ignored_chat_type"
    }));
  });

  it("atualiza metadados e status da conversa", async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const conversationServer = await import("../conversation.server");
    
    ((supabaseAdmin as any).maybeSingle as any).mockResolvedValue({
      data: { id: "agent-1", status: "ativo", unidade_id: "unit-1" },
      error: null
    });

    const payload = {
      instance: "inst-1",
      data: {
        key: { remoteJid: "5541999999999@s.whatsapp.net", id: "m3", fromMe: false },
        pushName: "João",
        message: { conversation: "Olá" }
      }
    };

    await processMessagesUpsert(payload, "http://loc/api");

    // Verifica se chamou update na conversa (metadados) via o mock do conversation.server
    expect(conversationServer.updateConversationMetadata).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        unidade_id: "unit-1",
        agent_id: "agent-1"
      })
    );
  });
});
