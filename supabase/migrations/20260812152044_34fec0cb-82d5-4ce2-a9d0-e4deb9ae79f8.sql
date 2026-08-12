DROP POLICY IF EXISTS "Allow authenticated full access" ON public.evo_trace_logs;
REVOKE ALL ON public.evo_trace_logs FROM authenticated;
GRANT SELECT ON public.evo_trace_logs TO authenticated;
GRANT ALL ON public.evo_trace_logs TO service_role;
ALTER TABLE public.evo_trace_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can select trace logs" ON public.evo_trace_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));