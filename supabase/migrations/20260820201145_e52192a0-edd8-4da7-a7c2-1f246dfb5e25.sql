
REVOKE ALL ON FUNCTION public.user_can_access_unit(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_can_access_unit(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_can_access_unit(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_unit(uuid, text) TO service_role;
