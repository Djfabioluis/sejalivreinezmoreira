-- Regras de cross-sell configuradas pelo usuário
CREATE TABLE public.sugestoes_cross_sell (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id TEXT,
  salon_nome TEXT,
  trigger_service_id TEXT NOT NULL,
  trigger_service_nome TEXT,
  suggested_service_id TEXT NOT NULL,
  suggested_service_nome TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  limite_por_servico_dia INTEGER,
  limite_por_cliente_dia INTEGER,
  limite_por_conversa INTEGER DEFAULT 1,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.sugestoes_cross_sell TO service_role;
ALTER TABLE public.sugestoes_cross_sell ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sugestoes_trigger
  ON public.sugestoes_cross_sell (trigger_service_id, ativo);

CREATE TRIGGER set_updated_at_sugestoes_cross_sell
  BEFORE UPDATE ON public.sugestoes_cross_sell
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Registro de cada oferta feita pela IA (para respeitar limites diários)
CREATE TABLE public.sugestoes_registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  regra_id UUID REFERENCES public.sugestoes_cross_sell(id) ON DELETE SET NULL,
  salon_id TEXT,
  trigger_service_id TEXT,
  suggested_service_id TEXT NOT NULL,
  suggested_service_nome TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ofertado', -- ofertado | aceito | recusado
  sandbox BOOLEAN NOT NULL DEFAULT false,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.sugestoes_registros TO service_role;
ALTER TABLE public.sugestoes_registros ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sugestoes_registros_dia
  ON public.sugestoes_registros (suggested_service_id, created_at);
CREATE INDEX idx_sugestoes_registros_cliente_dia
  ON public.sugestoes_registros (phone, created_at);