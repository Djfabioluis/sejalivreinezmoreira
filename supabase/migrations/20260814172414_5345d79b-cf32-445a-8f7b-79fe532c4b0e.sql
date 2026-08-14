CREATE OR REPLACE FUNCTION public.append_wa_message(p_phone text, p_new_message jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_messages jsonb;
    v_new_messages jsonb;
    v_result jsonb;
BEGIN
    -- 1. Obter ou Criar a conversa
    SELECT messages INTO v_messages
    FROM wa_conversas
    WHERE phone = p_phone;

    IF NOT FOUND THEN
        INSERT INTO wa_conversas (phone, messages, updated_at, status)
        VALUES (p_phone, '[]'::jsonb, now(), 'novo')
        RETURNING messages INTO v_messages;
    END IF;

    -- 2. Concatenar e Limitar histórico (200 mensagens)
    v_new_messages = (COALESCE(v_messages, '[]'::jsonb) || jsonb_build_array(p_new_message));
    
    IF jsonb_array_length(v_new_messages) > 200 THEN
        v_new_messages = (
            SELECT jsonb_agg(elem)
            FROM (
                SELECT elem
                FROM jsonb_array_elements(v_new_messages) WITH ORDINALITY AS t(elem, idx)
                ORDER BY idx DESC
                LIMIT 200
            ) sub
        );
        -- Reordenar de volta para cronológico
        v_new_messages = (
            SELECT jsonb_agg(elem)
            FROM (
                SELECT elem
                FROM jsonb_array_elements(v_new_messages) WITH ORDINALITY AS t(elem, idx)
                ORDER BY idx ASC
            ) sub
        );
    END IF;

    -- 3. Atualizar a conversa
    UPDATE wa_conversas
    SET 
        messages = v_new_messages,
        updated_at = now(),
        unread_count = CASE WHEN (p_new_message->>'role') = 'user' THEN unread_count + 1 ELSE unread_count END
    WHERE phone = p_phone
    RETURNING row_to_json(wa_conversas)::jsonb INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_wa_message(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.append_wa_message(text, jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.append_wa_message(text, jsonb) TO service_role;
