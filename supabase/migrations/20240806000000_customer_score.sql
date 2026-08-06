-- Migration to add conversion_score to crm_customer_pipeline
ALTER TABLE public.crm_customer_pipeline ADD COLUMN IF NOT EXISTS conversion_score INTEGER DEFAULT 0;

-- Grant permissions (standard procedure)
GRANT UPDATE, SELECT ON public.crm_customer_pipeline TO authenticated;
GRANT ALL ON public.crm_customer_pipeline TO service_role;

-- Logic for updating scores will be handled via TypeScript cron
