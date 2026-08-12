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
  v_total integer;
BEGIN
  SELECT * INTO v_row FROM public.wa_conversas WHERE phone = p_phone FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.wa_conversas (
      phone, instance, phone_number, contact_name, messages,
      unread_count, status, updated_at, customer_context
    )
    VALUES (
      p_phone, p_instance, p_phone_number, p_contact_name,
      jsonb_build_array(p_message),
      CASE WHEN p_increment_unread THEN 1 ELSE 0 END,
      COALESCE(p_new_status, 'aberta'), now(),
      COALESCE(p_customer_context, '{}'::jsonb)
    )
    RETURNING * INTO v_row;
  ELSE
    v_final_messages := (COALESCE(v_row.messages, '[]'::jsonb) || jsonb_build_array(p_message));
    v_total := jsonb_array_length(v_final_messages);

    IF v_total > 200 THEN
      SELECT COALESCE(jsonb_agg(t.elem ORDER BY t.ord), '[]'::jsonb)
        INTO v_final_messages
      FROM jsonb_array_elements(v_final_messages) WITH ORDINALITY AS t(elem, ord)
      WHERE t.ord > (v_total - 200);
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