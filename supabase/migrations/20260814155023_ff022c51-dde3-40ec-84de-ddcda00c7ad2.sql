
CREATE OR REPLACE FUNCTION public.append_wa_message(
    p_phone text,
    p_new_message jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_messages jsonb;
    v_final_messages jsonb;
BEGIN
    -- 1. Obter mensagens atuais
    SELECT messages INTO v_messages
    FROM public.wa_conversas
    WHERE phone = p_phone;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- 2. Append e Poda (limite 200 para performance/token)
    v_final_messages := COALESCE(v_messages, '[]'::jsonb) || p_new_message;
    
    IF jsonb_array_length(v_final_messages) > 200 THEN
        v_final_messages := (
            SELECT jsonb_agg(elem)
            FROM (
                SELECT elem
                FROM jsonb_array_elements(v_final_messages) WITH ORDINALITY AS t(elem, idx)
                ORDER BY idx DESC
                LIMIT 200
            ) sub
        );
        -- Reordenar para manter cronologia
        v_final_messages := (
            SELECT jsonb_agg(elem)
            FROM (
                SELECT elem
                FROM jsonb_array_elements(v_final_messages) WITH ORDINALITY AS t(elem, idx)
                ORDER BY idx ASC
            ) sub
        );
    END IF;

    -- 3. Update
    UPDATE public.wa_conversas
    SET 
        messages = v_final_messages,
        updated_at = now()
    WHERE phone = p_phone;

    RETURN v_final_messages;
END;
$$;

GRANT EXECUTE ON FUNCTION public.append_wa_message(text, jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.append_wa_message(text, jsonb) FROM PUBLIC, anon, authenticated;
