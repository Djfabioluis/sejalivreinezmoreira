GRANT INSERT, UPDATE, DELETE ON public.wa_agentes TO authenticated;

DROP POLICY IF EXISTS "Admins can insert wa_agentes" ON public.wa_agentes;
CREATE POLICY "Admins can insert wa_agentes"
ON public.wa_agentes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update wa_agentes" ON public.wa_agentes;
CREATE POLICY "Admins can update wa_agentes"
ON public.wa_agentes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete wa_agentes" ON public.wa_agentes;
CREATE POLICY "Admins can delete wa_agentes"
ON public.wa_agentes FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));