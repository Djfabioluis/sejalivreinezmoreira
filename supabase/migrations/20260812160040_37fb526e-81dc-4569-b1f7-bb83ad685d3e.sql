DROP FUNCTION IF EXISTS public.acquire_conversation_lock(text,text);
DROP FUNCTION IF EXISTS public.acquire_conversation_lock(text,text,int);
DROP FUNCTION IF EXISTS public.release_conversation_lock(text,text);

-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.evo_conversation_locks (
    conversation_key text PRIMARY KEY,
    trace_id text NOT NULL,
    locked_at timestamptz DEFAULT now()
);

GRANT ALL ON public.evo_conversation_locks TO authenticated, service_role;

-- Function to acquire lock with timeout
CREATE OR REPLACE FUNCTION public.acquire_conversation_lock(
    p_conversation_key text,
    p_trace_id text,
    p_timeout_seconds int DEFAULT 30
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete stale locks
    DELETE FROM public.evo_conversation_locks 
    WHERE locked_at < now() - (p_timeout_seconds || ' seconds')::interval;
    
    -- Try to insert lock
    BEGIN
        INSERT INTO public.evo_conversation_locks (conversation_key, trace_id, locked_at)
        VALUES (p_conversation_key, p_trace_id, now());
        RETURN true;
    EXCEPTION WHEN unique_violation THEN
        RETURN false;
    END;
END;
$$;

-- Function to release lock
CREATE OR REPLACE FUNCTION public.release_conversation_lock(
    p_conversation_key text,
    p_trace_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.evo_conversation_locks 
    WHERE conversation_key = p_conversation_key 
      AND trace_id = p_trace_id;
    RETURN true;
END;
$$;