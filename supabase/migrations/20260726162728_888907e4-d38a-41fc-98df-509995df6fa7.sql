
-- base_conhecimento: drop overly permissive public policies
DROP POLICY IF EXISTS "leitura publica base" ON public.base_conhecimento;
DROP POLICY IF EXISTS "insert publica base" ON public.base_conhecimento;
DROP POLICY IF EXISTS "update publica base" ON public.base_conhecimento;
REVOKE ALL ON public.base_conhecimento FROM anon, authenticated;
GRANT ALL ON public.base_conhecimento TO service_role;
ALTER TABLE public.base_conhecimento ENABLE ROW LEVEL SECURITY;

-- wa_conversas: enable RLS with no public policies (service_role bypasses RLS)
REVOKE ALL ON public.wa_conversas FROM anon, authenticated;
GRANT ALL ON public.wa_conversas TO service_role;
ALTER TABLE public.wa_conversas ENABLE ROW LEVEL SECURITY;
