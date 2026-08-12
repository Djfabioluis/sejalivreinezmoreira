
CREATE TABLE IF NOT EXISTS public.evo_trace_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    trace_id text NOT NULL,
    inbound_message_id text,
    conversation_id text,
    instance_id text,
    phone_last4 text,
    step text NOT NULL,
    status text,
    duration_ms integer,
    timestamp timestamptz DEFAULT now(),
    payload jsonb
);

CREATE INDEX IF NOT EXISTS idx_evo_trace_logs_trace_id ON public.evo_trace_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_evo_trace_logs_timestamp ON public.evo_trace_logs(timestamp);

GRANT ALL ON public.evo_trace_logs TO authenticated;
GRANT ALL ON public.evo_trace_logs TO service_role;
ALTER TABLE public.evo_trace_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access" ON public.evo_trace_logs FOR ALL TO authenticated USING (true);
