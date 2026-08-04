-- 1. Melhorar status da wa_conversas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wa_conversas_status_check') THEN
    ALTER TABLE public.wa_conversas ADD CONSTRAINT wa_conversas_status_check 
    CHECK (status IN ('aberta', 'aguardando_cliente', 'aguardando_humano', 'resolvida', 'arquivada'));
  END IF;
END
$$;

-- 2. Garantir permissões corretas
GRANT SELECT, UPDATE ON public.wa_conversas TO authenticated;
GRANT SELECT ON public.wa_agentes TO authenticated;
GRANT SELECT ON public.evo_webhook_logs TO authenticated;
GRANT SELECT, INSERT ON public.evo_events TO authenticated;

-- RLS: Remover qualquer política que dê acesso excessivo
DROP POLICY IF EXISTS "Anyone can read conversations" ON public.wa_conversas;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.wa_conversas;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.wa_conversas;

-- Política de leitura
CREATE POLICY "Authenticated users can read conversations"
ON public.wa_conversas FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update status and unread"
ON public.wa_conversas FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Melhorar a RPC append_wa_message (Drop antes para evitar ambiguidade)
DROP FUNCTION IF EXISTS public.append_wa_message(text, jsonb, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.append_wa_message(
  p_phone text,
  p_message jsonb,
  p_instance text DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_contact_name text DEFAULT NULL,
  p_increment_unread boolean DEFAULT false,
  p_new_status text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages jsonb;
  v_limit int := 200;
BEGIN
  -- 1. Buscar mensagens atuais (ou criar array vazio)
  SELECT messages INTO v_messages
  FROM public.wa_conversas
  WHERE phone = p_phone;

  IF v_messages IS NULL OR jsonb_typeof(v_messages) <> 'array' THEN
    v_messages := '[]'::jsonb;
  END IF;

  -- 2. Concatenar nova mensagem e limitar a 200 (mantendo as últimas)
  v_messages := v_messages || p_message;
  
  IF jsonb_array_length(v_messages) > v_limit THEN
    v_messages := (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem
        FROM jsonb_array_elements(v_messages) AS elem
        OFFSET (jsonb_array_length(v_messages) - v_limit)
      ) AS sub
    );
  END IF;

  -- 3. Upsert na tabela
  INSERT INTO public.wa_conversas (
    phone, 
    messages, 
    updated_at, 
    instance, 
    phone_number, 
    contact_name, 
    unread_count,
    status
  )
  VALUES (
    p_phone, 
    v_messages, 
    now(), 
    p_instance, 
    p_phone_number, 
    p_contact_name, 
    CASE WHEN p_increment_unread THEN 1 ELSE 0 END,
    COALESCE(p_new_status, 'aberta')
  )
  ON CONFLICT (phone) DO UPDATE SET
    messages = EXCLUDED.messages,
    updated_at = EXCLUDED.updated_at,
    instance = COALESCE(EXCLUDED.instance, wa_conversas.instance),
    phone_number = COALESCE(EXCLUDED.phone_number, wa_conversas.phone_number),
    contact_name = COALESCE(EXCLUDED.contact_name, wa_conversas.contact_name),
    unread_count = CASE 
      WHEN p_increment_unread THEN wa_conversas.unread_count + 1 
      ELSE wa_conversas.unread_count 
    END,
    status = COALESCE(p_new_status, wa_conversas.status);
END;
$$;

-- Revogar execução pública da RPC
REVOKE EXECUTE ON FUNCTION public.append_wa_message FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_wa_message TO service_role;
