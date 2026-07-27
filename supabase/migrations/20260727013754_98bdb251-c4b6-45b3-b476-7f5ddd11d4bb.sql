
CREATE TABLE public.operador_permissoes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  permissoes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.operador_permissoes TO authenticated;
GRANT ALL ON public.operador_permissoes TO service_role;
ALTER TABLE public.operador_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage operador_permissoes"
  ON public.operador_permissoes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users read own permissoes"
  ON public.operador_permissoes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_operador_permissoes_updated_at
  BEFORE UPDATE ON public.operador_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.operador_permissoes_default (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  permissoes text[] NOT NULL DEFAULT ARRAY['painel','agendar']::text[],
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.operador_permissoes_default TO authenticated;
GRANT ALL ON public.operador_permissoes_default TO service_role;
ALTER TABLE public.operador_permissoes_default ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage defaults"
  ON public.operador_permissoes_default FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated read defaults"
  ON public.operador_permissoes_default FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.operador_permissoes_default (id, permissoes)
  VALUES (1, ARRAY['painel','agendar'])
  ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_my_permissoes()
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  perms text[];
BEGIN
  IF uid IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  IF public.has_role(uid, 'admin') THEN
    RETURN ARRAY['painel','agendar','base-conhecimento','boas-vindas','operadores','sugestoes','auditoria-sugestoes','integracao-bemp','acessos','usuarios','assinantes','permissoes'];
  END IF;
  SELECT permissoes INTO perms FROM public.operador_permissoes WHERE user_id = uid;
  IF perms IS NULL THEN
    SELECT permissoes INTO perms FROM public.operador_permissoes_default WHERE id = 1;
  END IF;
  RETURN COALESCE(perms, ARRAY[]::text[]);
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_permissoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_permissoes() TO authenticated;
