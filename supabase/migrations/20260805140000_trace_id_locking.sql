-- 1. Melhorar evo_events com estados e trace_id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'evo_events' AND COLUMN_NAME = 'trace_id') THEN
        ALTER TABLE public.evo_events ADD COLUMN trace_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'evo_events' AND COLUMN_NAME = 'assistant_response_id') THEN
        ALTER TABLE public.evo_events ADD COLUMN assistant_response_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'evo_events' AND COLUMN_NAME = 'payload') THEN
        ALTER TABLE public.evo_events ADD COLUMN payload jsonb;
    END IF;
END $$;

-- Atualizar UNIQUE para ser atômico na inserção (instance, message_id)
-- Já existe no migration anterior, mas garantimos aqui.

-- 2. Tabela de Locks de Conversa (Prevenção de concorrência)
CREATE TABLE IF NOT EXISTS public.wa_conversation_locks (
    conversation_key text PRIMARY KEY,
    trace_id text NOT NULL,
    acquired_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT now() + interval '2 minutes'
);

ALTER TABLE public.wa_conversation_locks ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.wa_conversation_locks TO service_role;

-- 3. Função para adquirir lock atômico
CREATE OR REPLACE FUNCTION public.acquire_conversation_lock(p_conversation_key text, p_trace_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Limpar locks expirados
    DELETE FROM public.wa_conversation_locks WHERE expires_at < now();

    -- Tentar inserir novo lock
    INSERT INTO public.wa_conversation_locks (conversation_key, trace_id)
    VALUES (p_conversation_key, p_trace_id)
    ON CONFLICT (conversation_key) DO NOTHING;

    RETURN FOUND;
END;
$$;

-- 4. Função para liberar lock
CREATE OR REPLACE FUNCTION public.release_conversation_lock(p_conversation_key text, p_trace_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.wa_conversation_locks 
    WHERE conversation_key = p_conversation_key AND trace_id = p_trace_id;
END;
$$;
