-- Revoke public execution of the newly created function to satisfy security linter
REVOKE EXECUTE ON FUNCTION public.transfer_conversation_unit(text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_conversation_unit(text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_conversation_unit(text, text, uuid, text) TO service_role;
