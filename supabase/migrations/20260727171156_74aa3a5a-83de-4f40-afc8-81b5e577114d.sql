-- 1) Revogar EXECUTE de authenticated/anon/public para SECURITY DEFINER helpers não chamados diretamente por usuários logados
REVOKE EXECUTE ON FUNCTION public.user_has_permission(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- 2) Política para admins lerem agendamentos_notif
DROP POLICY IF EXISTS "admins read agendamentos_notif" ON public.agendamentos_notif;
CREATE POLICY "admins read agendamentos_notif"
ON public.agendamentos_notif
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Restringir leitura de operador_permissoes_default apenas a admins
DROP POLICY IF EXISTS "authenticated read defaults" ON public.operador_permissoes_default;
CREATE POLICY "admins read defaults"
ON public.operador_permissoes_default
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));