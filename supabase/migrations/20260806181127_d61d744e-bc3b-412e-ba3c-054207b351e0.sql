
-- Tabela para garantir idempotência em agendamentos
CREATE TABLE IF NOT EXISTS public.bemp_idempotency (
    idempotency_key TEXT PRIMARY KEY,
    appointment_id TEXT NOT NULL,
    conversation_id TEXT,
    payload JSONB,
    response JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Permissões
GRANT SELECT, INSERT ON public.bemp_idempotency TO authenticated;
GRANT ALL ON public.bemp_idempotency TO service_role;

-- RLS
ALTER TABLE public.bemp_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated to insert idempotency"
    ON public.bemp_idempotency FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated to select idempotency"
    ON public.bemp_idempotency FOR SELECT
    TO authenticated
    USING (true);

-- Garantir que agendamentos_notif tenha o necessário
CREATE TABLE IF NOT EXISTS public.agendamentos_notif (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bemp_appointment_id TEXT UNIQUE,
    salon_id TEXT,
    service_id TEXT,
    service_name TEXT,
    start_at TIMESTAMPTZ,
    phone TEXT,
    name TEXT,
    sandbox BOOLEAN DEFAULT false,
    confirmation_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agendamentos_notif TO authenticated;
GRANT ALL ON public.agendamentos_notif TO service_role;
ALTER TABLE public.agendamentos_notif ENABLE ROW LEVEL SECURITY;

-- Política básica para permitir inserção/leitura
CREATE POLICY "Allow authenticated to manage agendamentos_notif"
    ON public.agendamentos_notif FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
