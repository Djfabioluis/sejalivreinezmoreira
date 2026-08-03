REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE ALL ON FUNCTION public.has_any_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_admin() TO service_role;

REVOKE ALL ON FUNCTION public.user_has_permission(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION public.get_my_permissoes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_permissoes() TO service_role;

REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO service_role;