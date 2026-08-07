ALTER TABLE public.crm_followup_rules 
  ADD COLUMN IF NOT EXISTS recipients text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS conditions_to_stop text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_goal text,
  ADD COLUMN IF NOT EXISTS ai_tone text DEFAULT 'amigável',
  ADD COLUMN IF NOT EXISTS allowed_days text[] DEFAULT '{"Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"}',
  ADD COLUMN IF NOT EXISTS min_interval_minutes integer DEFAULT 1440,
  ADD COLUMN IF NOT EXISTS allow_promotions boolean DEFAULT false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_followup_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_followup_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_followups TO authenticated;
GRANT ALL ON public.crm_followup_rules TO service_role;
GRANT ALL ON public.crm_followup_steps TO service_role;
GRANT ALL ON public.crm_followups TO service_role;
