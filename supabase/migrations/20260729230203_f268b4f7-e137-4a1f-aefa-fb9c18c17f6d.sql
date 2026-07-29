CREATE TABLE public.wa_agentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('feminino','masculino')),
  telefone text NOT NULL,
  instancia text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'aguardando_qr' CHECK (status IN ('aguardando_qr','conectado','desconectado')),
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wa_agentes TO authenticated;
GRANT ALL ON public.wa_agentes TO service_role;

ALTER TABLE public.wa_agentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver agentes"
ON public.wa_agentes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));