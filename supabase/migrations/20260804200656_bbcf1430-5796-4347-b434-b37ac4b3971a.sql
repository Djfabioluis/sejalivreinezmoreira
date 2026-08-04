-- 1. REMOVER ASSINATURAS ANTIGAS
DROP FUNCTION IF EXISTS public.append_wa_message(text, jsonb, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.append_wa_message(text, jsonb, text, text, text, boolean, text);
DROP FUNCTION IF EXISTS public.append_wa_message(text, jsonb, text, text, text, boolean, text, jsonb);

-- 2. CRIAR ASSINATURA OFICIAL
CREATE OR REPLACE FUNCTION public.append_wa_message(
  p_phone text,
  p_message jsonb,
  p_instance text DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_contact_name text DEFAULT NULL,
  p_increment_unread boolean DEFAULT false,
  p_new_status text DEFAULT NULL,
  p_customer_context jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_messages jsonb;
  v_existing_context jsonb;
  v_updated_at timestamptz := now();
  v_exists boolean;
BEGIN
  -- 1. Buscar conversa existente
  SELECT EXISTS(SELECT 1 FROM public.wa_conversas WHERE phone = p_phone) INTO v_exists;

  -- 2. Se não existir, criar
  IF NOT v_exists THEN
    INSERT INTO public.wa_conversas (
      phone,
      messages,
      instance,
      phone_number,
      contact_name,
      unread_count,
      status,
      customer_context,
      created_at,
      updated_at
    ) VALUES (
      p_phone,
      jsonb_build_array(p_message),
      p_instance,
      p_phone_number,
      p_contact_name,
      CASE WHEN p_increment_unread THEN 1 ELSE 0 END,
      COALESCE(p_new_status, 'waiting_for_unit_selection'),
      COALESCE(p_customer_context, '{}'::jsonb),
      v_updated_at,
      v_updated_at
    );
  ELSE
    -- 3. Se existir, anexar e atualizar
    SELECT messages, customer_context 
    INTO v_messages, v_existing_context
    FROM public.wa_conversas
    WHERE phone = p_phone;

    IF v_messages IS NULL OR jsonb_typeof(v_messages) <> 'array' THEN
      v_messages := '[]'::jsonb;
    END IF;

    -- Anexar mensagem (garantindo que seja um único item)
    v_messages := v_messages || jsonb_build_array(p_message);

    -- Limitar a 200 mensagens mantendo as últimas
    IF jsonb_array_length(v_messages) > 200 THEN
      v_messages := (
        SELECT jsonb_agg(elem ORDER BY ord ASC)
        FROM (
          SELECT elem, ord
          FROM jsonb_array_elements(v_messages) WITH ORDINALITY AS t(elem, ord)
          ORDER BY ord DESC
          LIMIT 200
        ) latest
      );
    END IF;

    -- Mesclar contexto se fornecido
    IF p_customer_context IS NOT NULL THEN
      v_existing_context := COALESCE(v_existing_context, '{}'::jsonb) || p_customer_context;
    END IF;

    -- Update
    UPDATE public.wa_conversas
    SET 
      messages = v_messages,
      instance = COALESCE(p_instance, instance),
      phone_number = COALESCE(p_phone_number, phone_number),
      contact_name = COALESCE(p_contact_name, contact_name),
      unread_count = CASE WHEN p_increment_unread THEN unread_count + 1 ELSE unread_count END,
      status = COALESCE(p_new_status, status),
      customer_context = v_existing_context,
      updated_at = v_updated_at
    WHERE phone = p_phone;
  END IF;

  RETURN jsonb_build_object('phone', p_phone, 'status', 'success');
END;
$$;

-- 3. PERMISSÕES
REVOKE ALL ON FUNCTION public.append_wa_message(text, jsonb, text, text, text, boolean, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_wa_message(text, jsonb, text, text, text, boolean, text, jsonb) TO service_role;