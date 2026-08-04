ALTER TABLE public.wa_conversas ADD COLUMN IF NOT EXISTS customer_context jsonb DEFAULT '{}'::jsonb;

GRANT ALL ON public.wa_conversas TO service_role;
GRANT SELECT, UPDATE ON public.wa_conversas TO authenticated;