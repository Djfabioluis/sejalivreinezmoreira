
-- Admin-only RLS policies for tables currently accessed only via server (service_role) code.
-- service_role bypasses RLS, so these policies only restrict direct API access from anon/authenticated.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'atendimentos_humanos',
    'base_conhecimento',
    'leads_assinatura',
    'operadores',
    'sugestoes_cross_sell',
    'sugestoes_registros',
    'wa_conversas'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %I" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "Admins manage %I" ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))',
      t, t
    );
  END LOOP;
END $$;

-- Lock down SECURITY DEFINER helper functions from direct API execution.
-- They remain callable from RLS policies and server functions using service_role.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_any_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
