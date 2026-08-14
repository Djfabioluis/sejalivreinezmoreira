-- Grant execute permission to service_role to ensure the function is accessible via RPC
GRANT EXECUTE ON FUNCTION public.append_wa_message(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.append_wa_message(text, jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.append_wa_message(text, jsonb) TO service_role;
