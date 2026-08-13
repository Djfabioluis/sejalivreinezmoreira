-- Drop the specific existing function signature
DROP FUNCTION IF EXISTS public.append_wa_message(text, jsonb, text, text, text, boolean, text, jsonb);

-- Recreate it as a CLEAN single-purpose function for history management
CREATE OR REPLACE FUNCTION public.append_wa_message(
    p_phone TEXT,
    p_new_message JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_messages JSONB;
    v_final_messages JSONB;
    v_total INT;
BEGIN
    SELECT messages INTO v_messages
    FROM public.wa_conversas
    WHERE phone = p_phone;

    IF v_messages IS NULL THEN
        v_messages := '[]'::jsonb;
    END IF;

    v_final_messages := v_messages || p_new_message;
    v_total := jsonb_array_length(v_final_messages);

    IF v_total > 200 THEN
        SELECT COALESCE(jsonb_agg(t.elem ORDER BY t.ord), '[]'::jsonb)
        INTO v_final_messages
        FROM jsonb_array_elements(v_final_messages)
        WITH ORDINALITY AS t(elem, ord)
        WHERE t.ord > (v_total - 200);
    END IF;

    UPDATE public.wa_conversas
    SET messages = v_final_messages,
        updated_at = now()
    WHERE phone = p_phone;

    RETURN v_final_messages;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.append_wa_message(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_wa_message(TEXT, JSONB) TO service_role;
COMMENT ON FUNCTION public.append_wa_message IS 'Adiciona mensagem ao histórico com limite de 200 itens (Ordinality Fix). Restrito a service_role.';