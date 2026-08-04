
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wa_conversas' AND column_name='instance') THEN
    ALTER TABLE public.wa_conversas ADD COLUMN instance text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wa_conversas' AND column_name='phone_number') THEN
    ALTER TABLE public.wa_conversas ADD COLUMN phone_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wa_conversas' AND column_name='contact_name') THEN
    ALTER TABLE public.wa_conversas ADD COLUMN contact_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wa_conversas' AND column_name='unread_count') THEN
    ALTER TABLE public.wa_conversas ADD COLUMN unread_count integer NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wa_conversas' AND column_name='last_read_at') THEN
    ALTER TABLE public.wa_conversas ADD COLUMN last_read_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wa_conversas' AND column_name='status') THEN
    ALTER TABLE public.wa_conversas ADD COLUMN status text NOT NULL DEFAULT 'aberta';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wa_conversas_updated_at ON public.wa_conversas(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_instance ON public.wa_conversas(instance);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_phone_number ON public.wa_conversas(phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_status ON public.wa_conversas(status);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_unread_count ON public.wa_conversas(unread_count);

UPDATE public.wa_conversas
SET 
  instance = split_part(phone, ':', 1),
  phone_number = split_part(phone, ':', 2)
WHERE instance IS NULL OR phone_number IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.wa_conversas TO authenticated;
GRANT ALL ON public.wa_conversas TO service_role;

-- RPC for atomic message append
CREATE OR REPLACE FUNCTION public.append_wa_message(
  p_phone text,
  p_message jsonb,
  p_instance text,
  p_phone_number text,
  p_contact_name text DEFAULT NULL,
  p_increment_unread boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wa_conversas (
    phone, 
    messages, 
    instance, 
    phone_number, 
    contact_name, 
    unread_count, 
    updated_at, 
    status
  )
  VALUES (
    p_phone, 
    jsonb_build_array(p_message), 
    p_instance, 
    p_phone_number, 
    p_contact_name, 
    CASE WHEN p_increment_unread THEN 1 ELSE 0 END, 
    now(), 
    'aberta'
  )
  ON CONFLICT (phone) DO UPDATE SET
    messages = (
      CASE 
        WHEN jsonb_array_length(public.wa_conversas.messages) >= 200 
        THEN (public.wa_conversas.messages - 0) || jsonb_build_array(p_message)
        ELSE public.wa_conversas.messages || jsonb_build_array(p_message)
      END
    ),
    instance = COALESCE(p_instance, public.wa_conversas.instance),
    phone_number = COALESCE(p_phone_number, public.wa_conversas.phone_number),
    contact_name = COALESCE(p_contact_name, public.wa_conversas.contact_name),
    unread_count = public.wa_conversas.unread_count + (CASE WHEN p_increment_unread THEN 1 ELSE 0 END),
    updated_at = now(),
    status = CASE WHEN p_increment_unread THEN 'aberta' ELSE public.wa_conversas.status END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_wa_message TO authenticated, service_role;

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wa_conversas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversas;
  END IF;
END $$;
