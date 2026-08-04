-- wa_conversas: remove blanket authenticated read/update
DROP POLICY IF EXISTS "Authenticated users can read conversations" ON public.wa_conversas;
DROP POLICY IF EXISTS "Authenticated users can update status and unread" ON public.wa_conversas;

CREATE POLICY "Staff can read conversations"
ON public.wa_conversas
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.user_has_permission(auth.uid(), 'agendar')
  OR public.user_has_permission(auth.uid(), 'painel')
);

CREATE POLICY "Staff can update conversations"
ON public.wa_conversas
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.user_has_permission(auth.uid(), 'agendar')
  OR public.user_has_permission(auth.uid(), 'painel')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.user_has_permission(auth.uid(), 'agendar')
  OR public.user_has_permission(auth.uid(), 'painel')
);

-- subscriptions: explicit deny of client-side inserts/deletes (service_role bypasses RLS)
REVOKE INSERT, DELETE, UPDATE ON public.subscriptions FROM authenticated;
REVOKE ALL ON public.subscriptions FROM anon;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;