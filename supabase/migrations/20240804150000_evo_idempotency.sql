-- Tabela para garantir idempotência e rastreamento de eventos da Evolution
CREATE TABLE IF NOT EXISTS public.evo_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instance text NOT NULL,
    message_id text NOT NULL,
    remote_jid text,
    status text DEFAULT 'received', -- received, processing, completed, error, duplicate
    created_at timestamptz DEFAULT now(),
    processed_at timestamptz,
    UNIQUE(instance, message_id)
);

GRANT SELECT, INSERT, UPDATE ON public.evo_events TO authenticated;
GRANT ALL ON public.evo_events TO service_role;

-- Índice para busca rápida por instância e JID (histórico)
CREATE INDEX IF NOT EXISTS idx_evo_events_instance_jid ON public.evo_events(instance, remote_jid);

ALTER TABLE public.evo_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on evo_events"
ON public.evo_events
FOR ALL
TO service_role
USING (true);
