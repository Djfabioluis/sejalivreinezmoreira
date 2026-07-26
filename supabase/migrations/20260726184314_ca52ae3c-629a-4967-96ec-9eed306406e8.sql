CREATE TABLE public.operadores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  email text,
  telefone text,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.operadores TO service_role;

ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_operadores_updated_at
BEFORE UPDATE ON public.operadores
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();