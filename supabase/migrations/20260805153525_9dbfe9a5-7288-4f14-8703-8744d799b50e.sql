ALTER TABLE public.evo_events
  ADD COLUMN IF NOT EXISTS trace_id text,
  ADD COLUMN IF NOT EXISTS assistant_response_id text,
  ADD COLUMN IF NOT EXISTS assistant_response_status text,
  ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_detail text,
  ADD COLUMN IF NOT EXISTS payload jsonb;

CREATE TABLE IF NOT EXISTS public.wa_conversation_locks (
  conversation_key text PRIMARY KEY,
  trace_id text NOT NULL,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '2 minutes'
);

GRANT ALL ON public.wa_conversation_locks TO service_role;
ALTER TABLE public.wa_conversation_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role manages wa_conversation_locks" ON public.wa_conversation_locks;
CREATE POLICY "service role manages wa_conversation_locks"
  ON public.wa_conversation_locks FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.acquire_conversation_lock(p_conversation_key text, p_trace_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted int;
BEGIN
  DELETE FROM public.wa_conversation_locks WHERE expires_at < now();

  INSERT INTO public.wa_conversation_locks (conversation_key, trace_id, acquired_at, expires_at)
  VALUES (p_conversation_key, p_trace_id, now(), now() + interval '2 minutes')
  ON CONFLICT (conversation_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_conversation_lock(p_conversation_key text, p_trace_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.wa_conversation_locks
  WHERE conversation_key = p_conversation_key
    AND (trace_id = p_trace_id OR expires_at < now());
END;
$$;

-- Reserva atômica de um evento recebido (idempotência por instance + message_id)
CREATE OR REPLACE FUNCTION public.evo_claim_event(
  p_instance text,
  p_message_id text,
  p_remote_jid text,
  p_trace_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.evo_events%ROWTYPE;
  v_inserted int;
BEGIN
  INSERT INTO public.evo_events (instance, message_id, remote_jid, status, trace_id, processing_started_at)
  VALUES (p_instance, p_message_id, p_remote_jid, 'processing', p_trace_id, now())
  ON CONFLICT (instance, message_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted > 0 THEN
    RETURN jsonb_build_object('claimed', true, 'reason', 'new_event');
  END IF;

  SELECT * INTO v_row FROM public.evo_events
   WHERE instance = p_instance AND message_id = p_message_id;

  IF v_row.status IN ('sent', 'processed') THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'duplicate_message');
  END IF;

  IF v_row.status = 'processing'
     AND COALESCE(v_row.processing_started_at, v_row.created_at) > now() - interval '2 minutes' THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'in_progress');
  END IF;

  UPDATE public.evo_events
     SET status = 'processing',
         processing_started_at = now(),
         trace_id = p_trace_id,
         remote_jid = COALESCE(p_remote_jid, remote_jid)
   WHERE instance = p_instance AND message_id = p_message_id;

  RETURN jsonb_build_object(
    'claimed', true,
    'reason', CASE WHEN v_row.status = 'processing' THEN 'stale_processing_recovered' ELSE 'retry_' || COALESCE(v_row.status, 'received') END
  );
END;
$$;

-- Limpeza segura de registros abandonados (mantém auditoria)
UPDATE public.evo_events
   SET status = 'failed',
       error_detail = COALESCE(error_detail, 'stale_processing_marked_failed')
 WHERE status = 'processing'
   AND COALESCE(processing_started_at, created_at) < now() - interval '2 minutes';

DELETE FROM public.wa_conversation_locks WHERE expires_at < now();