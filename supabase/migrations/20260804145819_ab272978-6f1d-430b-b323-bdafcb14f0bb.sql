CREATE TABLE IF NOT EXISTS public.evo_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance TEXT NOT NULL,
    message_id TEXT,
    event TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'error', 'received'
    duration_ms INTEGER,
    error_detail TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.evo_webhook_logs TO authenticated;
GRANT ALL ON public.evo_webhook_logs TO service_role;

ALTER TABLE public.evo_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select logs"
ON public.evo_webhook_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_evo_webhook_logs_instance ON public.evo_webhook_logs(instance);
CREATE INDEX idx_evo_webhook_logs_message_id ON public.evo_webhook_logs(message_id);
CREATE INDEX idx_evo_webhook_logs_created_at ON public.evo_webhook_logs(created_at DESC);