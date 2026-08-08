CREATE TABLE IF NOT EXISTS public.ai_sent_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instance text NOT NULL,
    message_id text NOT NULL,
    phone text NOT NULL,
    sent_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_ai_sent_messages_lookup ON public.ai_sent_messages (instance, message_id);

-- Cleanup function for old messages (TTL)
CREATE OR REPLACE FUNCTION public.cleanup_old_ai_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM public.ai_sent_messages WHERE sent_at < now() - interval '48 hours';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON public.ai_sent_messages TO service_role;
GRANT SELECT, INSERT ON public.ai_sent_messages TO authenticated;

-- Ensure wa_conversas has the new columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wa_conversas' AND column_name = 'attendance_mode') THEN
        ALTER TABLE public.wa_conversas ADD COLUMN attendance_mode text DEFAULT 'AI';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wa_conversas' AND column_name = 'human_takeover_at') THEN
        ALTER TABLE public.wa_conversas ADD COLUMN human_takeover_at timestamptz;
    END IF;
END $$;
