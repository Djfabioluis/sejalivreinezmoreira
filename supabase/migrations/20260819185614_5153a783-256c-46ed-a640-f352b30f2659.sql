DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.wa_julia_service_hours;

CREATE POLICY "Staff can view service hours"
ON public.wa_julia_service_hours FOR SELECT TO authenticated
USING (public.user_has_permission(auth.uid(), 'agentes-whatsapp') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage service hours"
ON public.wa_julia_service_hours FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can view own acknowledgements"
ON public.employee_manual_acknowledgements FOR SELECT TO authenticated
USING (professional_id = auth.uid());

CREATE POLICY "Professionals can insert own acknowledgements"
ON public.employee_manual_acknowledgements FOR INSERT TO authenticated
WITH CHECK (professional_id = auth.uid());

GRANT SELECT, INSERT ON public.employee_manual_acknowledgements TO authenticated;
GRANT SELECT ON public.wa_julia_service_hours TO authenticated;
GRANT ALL ON public.wa_julia_service_hours TO service_role;