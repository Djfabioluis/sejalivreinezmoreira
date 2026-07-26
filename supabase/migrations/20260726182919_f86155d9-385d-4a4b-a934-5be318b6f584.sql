CREATE TABLE public.atendimentos_humanos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  phone text,
  phone_country_code text,
  phone_area_code text,
  phone_number text,
  motivo text,
  canal text NOT NULL DEFAULT 'chat',
  status text NOT NULL DEFAULT 'aguardando',
  observacoes text,
  sandbox boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

GRANT ALL ON public.atendimentos_humanos TO service_role;

ALTER TABLE public.atendimentos_humanos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_atendimentos_humanos_updated
BEFORE UPDATE ON public.atendimentos_humanos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_atendimentos_humanos_status_created ON public.atendimentos_humanos (status, created_at DESC);
CREATE INDEX idx_atendimentos_humanos_phone ON public.atendimentos_humanos (phone);