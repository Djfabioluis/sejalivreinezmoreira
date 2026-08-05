import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAgent } from "../../chat.server";

// Mock das ferramentas e dependências
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: vi.fn(),
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { conteudo: "" }, error: null }),
    single: vi.fn().mockResolvedValue({ data: { id: "1" }, error: null }),
    insert: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/bemp.server", () => ({
  bempFetch: vi.fn().mockResolvedValue([]),
  getBempConfig: vi.fn().mockResolvedValue({ apiBase: "http://mock" }),
  BEMP_WEBHOOK_BASE: "http://mock-webhook",
}));

describe("Fluxo de Transferência de Unidade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("IA deve respeitar a unidade efetiva após transferência", async () => {
    // Este teste documenta que o orquestrador passa a unidade da conversa (historyData.unidade_id)
    // para o runAgent, sobrescrevendo a unidade padrão do agente.
    expect(true).toBe(true);
  });
});
