import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEvolutionText } from './evolution.server';
import { containsCpfSolicitation } from './subscription-policy.server';

// Mocking dependencies
vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('./observability/logger.server', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// We need to mock fetch because sendEvolutionText calls evoFetch which calls fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  text: () => Promise.resolve(JSON.stringify({ ok: true })),
});

describe('containsCpfSolicitation', () => {
  it('should detect various CPF solicitation patterns', () => {
    expect(containsCpfSolicitation("Informe seu CPF para continuar")).toBe(true);
    expect(containsCpfSolicitation("preciso do seu CPF")).toBe(true);
    expect(containsCpfSolicitation("000.000.000-00")).toBe(true);
    expect(containsCpfSolicitation("Olá, tudo bem?")).toBe(false);
  });
});

describe('sendEvolutionText Transport Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should block CPF solicitation even without context (Fail-closed)', async () => {
    const body = "Para localizar seu plano, informe seu CPF (000.000.000-00).";
    
    await sendEvolutionText("instance1", "5511999999999", body);
    
    // Check if fetch was called with the REPLACEMENT message, not the original body
    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const payload = JSON.parse(fetchCall[1].body as string);
    
    expect(payload.text).not.toContain("CPF");
    expect(payload.text).toContain("número de telefone cadastrado");
  });

  it('should block CPF even if Supabase fails', async () => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    vi.mocked(supabaseAdmin.from).mockImplementation(() => {
      throw new Error("Supabase Down");
    });

    const body = "Me informe seu CPF por favor.";
    await sendEvolutionText("instance1", "5511999999999", body);

    const fetchCall = vi.mocked(global.fetch).mock.calls[0];
    const payload = JSON.parse(fetchCall[1].body as string);
    
    expect(payload.text).toContain("telefone cadastrado");
  });
});
