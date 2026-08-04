REVOKE ALL ON public.base_conhecimento FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.base_conhecimento TO authenticated;
GRANT ALL ON public.base_conhecimento TO service_role;
ALTER TABLE public.base_conhecimento ENABLE ROW LEVEL SECURITY;