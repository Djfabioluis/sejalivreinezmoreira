
REVOKE EXECUTE ON FUNCTION public.append_wa_message(text, jsonb, text, text, text, boolean, text, jsonb) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.append_wa_message(text, jsonb, text, text, text, boolean, text, jsonb) TO service_role;
