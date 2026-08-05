REVOKE EXECUTE ON FUNCTION public.acquire_conversation_lock(text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.release_conversation_lock(text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.evo_claim_event(text, text, text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.acquire_conversation_lock(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_conversation_lock(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.evo_claim_event(text, text, text, text) TO service_role;