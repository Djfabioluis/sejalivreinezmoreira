-- Ensure wa_conversas is part of the realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'wa_conversas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_conversas;
    END IF;
END $$;

-- Set replica identity to FULL to ensure we get all data in UPDATE payloads
ALTER TABLE public.wa_conversas REPLICA IDENTITY FULL;
