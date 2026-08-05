CREATE TABLE IF NOT EXISTS public.evo_media_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance text NOT NULL,
  message_id text NOT NULL,
  media_hash text NOT NULL DEFAULT '',
  source_type text,
  status text NOT NULL DEFAULT 'queued',
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instance, message_id, media_hash)
);

GRANT SELECT ON public.evo_media_analysis TO authenticated;
GRANT ALL ON public.evo_media_analysis TO service_role;

ALTER TABLE public.evo_media_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read media analysis" ON public.evo_media_analysis;
CREATE POLICY "Admins read media analysis"
ON public.evo_media_analysis
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.evo_claim_media(
  p_instance text,
  p_message_id text,
  p_media_hash text,
  p_source_type text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed boolean := false;
BEGIN
  INSERT INTO public.evo_media_analysis (instance, message_id, media_hash, source_type, status)
  VALUES (p_instance, p_message_id, COALESCE(p_media_hash, ''), p_source_type, 'processing')
  ON CONFLICT (instance, message_id, media_hash) DO UPDATE
    SET status = 'processing', updated_at = now()
    WHERE public.evo_media_analysis.status = 'failed'
       OR public.evo_media_analysis.updated_at < now() - interval '5 minutes'
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

REVOKE ALL ON FUNCTION public.evo_claim_media(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.evo_claim_media(text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.evo_claim_media(text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.evo_claim_media(text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.evo_finish_media(
  p_instance text,
  p_message_id text,
  p_media_hash text,
  p_status text,
  p_error text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.evo_media_analysis
     SET status = p_status, error_detail = LEFT(COALESCE(p_error, ''), 300), updated_at = now()
   WHERE instance = p_instance
     AND message_id = p_message_id
     AND media_hash = COALESCE(p_media_hash, '');
$$;

REVOKE ALL ON FUNCTION public.evo_finish_media(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.evo_finish_media(text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.evo_finish_media(text, text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.evo_finish_media(text, text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.update_wa_message_metadata(
  p_phone text,
  p_message_id text,
  p_metadata jsonb,
  p_text text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages jsonb;
  v_new jsonb := '[]'::jsonb;
  v_item jsonb;
BEGIN
  SELECT messages INTO v_messages FROM public.wa_conversas WHERE phone = p_phone;
  IF v_messages IS NULL THEN RETURN; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_messages) LOOP
    IF v_item->>'id' = p_message_id THEN
      v_item := jsonb_set(
        v_item,
        '{metadata}',
        COALESCE(v_item->'metadata', '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb),
        true
      );
      IF p_text IS NOT NULL AND length(p_text) > 0 THEN
        v_item := jsonb_set(
          v_item,
          '{parts}',
          jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_text)),
          true
        );
      END IF;
    END IF;
    v_new := v_new || jsonb_build_array(v_item);
  END LOOP;

  UPDATE public.wa_conversas
     SET messages = v_new, updated_at = now()
   WHERE phone = p_phone;
END;
$$;

REVOKE ALL ON FUNCTION public.update_wa_message_metadata(text, text, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_wa_message_metadata(text, text, jsonb, text) FROM anon;
REVOKE ALL ON FUNCTION public.update_wa_message_metadata(text, text, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.update_wa_message_metadata(text, text, jsonb, text) TO service_role;