DROP POLICY IF EXISTS "Admins and Operators can read CRM" ON public.crm_customer_pipeline;

CREATE POLICY "Painel users can read CRM pipeline"
  ON public.crm_customer_pipeline
  FOR SELECT
  TO authenticated
  USING (public.user_has_permission(auth.uid(), 'painel'));