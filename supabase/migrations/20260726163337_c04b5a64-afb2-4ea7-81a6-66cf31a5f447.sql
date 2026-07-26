
CREATE TABLE public.leads_assinatura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id integer,
  plano_nome text,
  nome text NOT NULL,
  email text,
  cpf text,
  phone_country_code text,
  phone_area_code text,
  phone_number text,
  observacoes text,
  origem text NOT NULL DEFAULT 'chat',
  sandbox boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.leads_assinatura TO service_role;
ALTER TABLE public.leads_assinatura ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER leads_assinatura_set_updated_at
BEFORE UPDATE ON public.leads_assinatura
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
