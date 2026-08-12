ALTER FUNCTION public.acquire_conversation_lock(text, text, integer) SET search_path = public;
ALTER FUNCTION public.release_conversation_lock(text, text) SET search_path = public;

REVOKE ALL ON FUNCTION public.acquire_conversation_lock(text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_conversation_lock(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_conversation_lock(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_conversation_lock(text, text) TO service_role;

ALTER TABLE public.evo_conversation_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evo_conversation_locks FROM anon, authenticated;
GRANT ALL ON public.evo_conversation_locks TO service_role;
DROP POLICY IF EXISTS "No client access to conversation locks" ON public.evo_conversation_locks;
CREATE POLICY "No client access to conversation locks"
ON public.evo_conversation_locks
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);