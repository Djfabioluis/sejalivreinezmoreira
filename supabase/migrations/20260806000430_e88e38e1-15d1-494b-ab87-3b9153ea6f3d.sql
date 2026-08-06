-- Securing remaining SECURITY DEFINER functions from direct API access
-- These functions are for server-side/internal use only.

REVOKE EXECUTE ON FUNCTION public.update_wa_message_metadata(text, text, jsonb, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_wa_message_metadata(text, text, jsonb, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.transfer_conversation_unit(text, text, uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_conversation_unit(text, text, uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.append_wa_message(text, jsonb, text, text, text, boolean, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_wa_message(text, jsonb, text, text, text, boolean, text, jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.evo_claim_event(text, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evo_claim_event(text, text, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.evo_claim_media(text, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evo_claim_media(text, text, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.evo_finish_media(text, text, text, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evo_finish_media(text, text, text, text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.acquire_conversation_lock(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_conversation_lock(text, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.release_conversation_lock(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_conversation_lock(text, text) TO service_role;
