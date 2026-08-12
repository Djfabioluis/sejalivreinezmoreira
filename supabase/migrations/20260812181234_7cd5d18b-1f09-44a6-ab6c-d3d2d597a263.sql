
-- 1. Garantir colunas necessárias em wa_conversas
ALTER TABLE public.wa_conversas
ADD COLUMN IF NOT EXISTS instance text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_read_at timestamptz,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aberta';

-- 2. Índices de performance
CREATE INDEX IF NOT EXISTS idx_wa_conversas_instance ON public.wa_conversas(instance);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_phone_number ON public.wa_conversas(phone_number);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_status ON public.wa_conversas(status);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_unread_count ON public.wa_conversas(unread_count);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_updated_at_desc ON public.wa_conversas(updated_at DESC);

-- 3. Remover função antiga para evitar conflito de retorno
DROP FUNCTION IF EXISTS public.append_wa_message(text,jsonb,text,text,text,boolean,text,jsonb);
DROP FUNCTION IF EXISTS public.append_wa_message(text,jsonb,text,text,text,boolean);

-- 4. Função atômica para anexar mensagens
CREATE OR REPLACE FUNCTION public.append_wa_message(
  p_phone text,
  p_message jsonb,
  p_instance text DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_contact_name text DEFAULT NULL,
  p_increment_unread boolean DEFAULT false,
  p_new_status text DEFAULT 'aberta',
  p_customer_context jsonb DEFAULT NULL
)
RETURNS public.wa_conversas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.wa_conversas;
  v_final_messages jsonb;
BEGIN
  -- Tentar obter a conversa existente com lock
  SELECT * INTO v_row FROM public.wa_conversas WHERE phone = p_phone FOR UPDATE;

  IF NOT FOUND THEN
    -- Criar nova se não existir
    INSERT INTO public.wa_conversas (
      phone, 
      instance, 
      phone_number, 
      contact_name, 
      messages, 
      unread_count, 
      status, 
      updated_at,
      customer_context
    )
    VALUES (
      p_phone, 
      p_instance, 
      p_phone_number, 
      p_contact_name, 
      jsonb_build_array(p_message), 
      CASE WHEN p_increment_unread THEN 1 ELSE 0 END, 
      COALESCE(p_new_status, 'aberta'), 
      now(),
      COALESCE(p_customer_context, '{}'::jsonb)
    )
    RETURNING * INTO v_row;
  ELSE
    -- Anexar mensagem ao array existente (limitar a 200 mensagens para performance)
    v_final_messages := (v_row.messages || jsonb_build_array(p_message));
    IF jsonb_array_length(v_final_messages) > 200 THEN
      v_final_messages := (SELECT jsonb_agg(elem) FROM (SELECT * FROM jsonb_array_elements(v_final_messages) OFFSET (jsonb_array_length(v_final_messages) - 200)) t);
    END IF;

    UPDATE public.wa_conversas
    SET 
      messages = v_final_messages,
      unread_count = CASE WHEN p_increment_unread THEN unread_count + 1 ELSE unread_count END,
      status = COALESCE(p_new_status, status),
      instance = COALESCE(p_instance, instance),
      phone_number = COALESCE(p_phone_number, phone_number),
      contact_name = COALESCE(p_contact_name, contact_name),
      customer_context = COALESCE(p_customer_context, customer_context),
      updated_at = now()
    WHERE phone = p_phone
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_wa_message TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_wa_message TO service_role;
