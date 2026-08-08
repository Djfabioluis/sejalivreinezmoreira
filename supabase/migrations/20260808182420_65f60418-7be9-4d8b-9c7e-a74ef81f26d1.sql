CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  perms text[];
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  -- Signed-in callers may only inspect their own permissions.
  IF auth.uid() IS NOT NULL AND _user_id <> auth.uid() THEN RETURN false; END IF;
  IF public.has_role(_user_id, 'admin') THEN RETURN true; END IF;
  SELECT permissoes INTO perms FROM public.operador_permissoes WHERE user_id = _user_id;
  IF perms IS NULL THEN
    SELECT permissoes INTO perms FROM public.operador_permissoes_default WHERE id = 1;
  END IF;
  RETURN COALESCE(perms, ARRAY[]::text[]) @> ARRAY[_perm];
END;
$function$;