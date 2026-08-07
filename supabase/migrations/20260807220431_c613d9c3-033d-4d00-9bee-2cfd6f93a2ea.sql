ALTER TABLE public.crm_followups ADD COLUMN IF NOT EXISTS cancel_reason text;
COMMENT ON COLUMN public.crm_followups.cancel_reason IS 'Motivo do cancelamento do follow-up. Valores: CUSTOMER_REPLIED, APPOINTMENT_COMPLETED, RULE_DISABLED, OUTSIDE_ALLOWED_WINDOW, HUMAN_TAKEOVER, AI_DISABLED, OPT_OUT, INVALID_PHONE, NO_ELIGIBLE_TRIGGER, DUPLICATE, LOCKED, UNKNOWN';

ALTER TABLE public.crm_followups ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

GRANT SELECT, UPDATE, INSERT ON public.crm_followups TO authenticated;
GRANT ALL ON public.crm_followups TO service_role;
