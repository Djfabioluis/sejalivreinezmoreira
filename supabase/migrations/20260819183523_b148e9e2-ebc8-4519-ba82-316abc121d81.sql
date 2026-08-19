-- Create wa_julia_service_hours table
CREATE TABLE IF NOT EXISTS public.wa_julia_service_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_active BOOLEAN NOT NULL DEFAULT true,
    opening_time TIME NOT NULL DEFAULT '08:00',
    closing_time TIME NOT NULL DEFAULT '20:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(unidade_id, day_of_week)
);

-- Add columns to wa_agentes
ALTER TABLE public.wa_agentes 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
ADD COLUMN IF NOT EXISTS service_hours_enabled BOOLEAN DEFAULT false;

-- Add index for unit lookups
CREATE INDEX IF NOT EXISTS idx_wa_julia_service_hours_unit ON public.wa_julia_service_hours(unidade_id);

-- RLS for wa_julia_service_hours
ALTER TABLE public.wa_julia_service_hours ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_julia_service_hours TO authenticated;
GRANT ALL ON public.wa_julia_service_hours TO service_role;

CREATE POLICY "Allow all for authenticated users" ON public.wa_julia_service_hours
    FOR ALL TO authenticated USING (true);

-- Function to handle out of hours message idempotency (per window)
ALTER TABLE public.wa_conversas
ADD COLUMN IF NOT EXISTS out_of_hours_message_sent_at TIMESTAMPTZ;
