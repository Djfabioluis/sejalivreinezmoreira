
REVOKE EXECUTE ON FUNCTION public.append_wa_message(text, jsonb, text, text, text, boolean, text, jsonb) FROM authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_wa_message(text, jsonb, text, text, text, boolean, text, jsonb) TO service_role;

-- Diagnóstico de permissões via SQL direto
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT grantee, privilege_type 
        FROM information_schema.role_routine_grants 
        WHERE routine_name = 'append_wa_message'
    LOOP
        RAISE NOTICE 'Grantee: %, Privilege: %', r.grantee, r.privilege_type;
    END LOOP;
END $$;
