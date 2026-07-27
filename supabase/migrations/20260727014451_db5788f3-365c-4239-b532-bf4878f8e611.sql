
CREATE OR REPLACE FUNCTION public.get_my_permissoes()
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  perms text[];
BEGIN
  IF uid IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  IF public.has_role(uid, 'admin') THEN
    RETURN ARRAY['painel','agendar','bemp','base-conhecimento','boas-vindas','operadores','sugestoes','auditoria-sugestoes','integracao-bemp','acessos','usuarios','assinantes','permissoes'];
  END IF;
  SELECT permissoes INTO perms FROM public.operador_permissoes WHERE user_id = uid;
  IF perms IS NULL THEN
    SELECT permissoes INTO perms FROM public.operador_permissoes_default WHERE id = 1;
  END IF;
  RETURN COALESCE(perms, ARRAY[]::text[]);
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_permissoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_permissoes() TO authenticated;

CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _perm text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perms text[];
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id, 'admin') THEN RETURN true; END IF;
  SELECT permissoes INTO perms FROM public.operador_permissoes WHERE user_id = _user_id;
  IF perms IS NULL THEN
    SELECT permissoes INTO perms FROM public.operador_permissoes_default WHERE id = 1;
  END IF;
  RETURN COALESCE(perms, ARRAY[]::text[]) @> ARRAY[_perm];
END;
$$;
REVOKE ALL ON FUNCTION public.user_has_permission(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;
