GRANT EXECUTE ON FUNCTION public.has_any_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;