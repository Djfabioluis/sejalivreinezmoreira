GRANT SELECT ON public.evo_events TO authenticated;

DROP POLICY IF EXISTS "admins read evo_events" ON public.evo_events;
CREATE POLICY "admins read evo_events"
ON public.evo_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));