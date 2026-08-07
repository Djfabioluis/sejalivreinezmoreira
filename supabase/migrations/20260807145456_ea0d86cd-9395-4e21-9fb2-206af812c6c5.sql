CREATE TABLE public.crm_followup_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'ABANDONMENT',
  enabled boolean NOT NULL DEFAULT true,
  delay_amount integer NOT NULL DEFAULT 30,
  delay_unit text NOT NULL DEFAULT 'MINUTES',
  message_mode text NOT NULL DEFAULT 'AI',
  fixed_message text,
  start_time time DEFAULT '08:00',
  end_time time DEFAULT '20:00',
  max_attempts integer NOT NULL DEFAULT 1,
  unit_id text,
  agent_id uuid REFERENCES public.wa_agentes(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_followup_rules TO authenticated;
GRANT ALL ON public.crm_followup_rules TO service_role;
ALTER TABLE public.crm_followup_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage followup rules" ON public.crm_followup_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.crm_followup_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES public.crm_followup_rules(id) ON DELETE CASCADE,
  delay_amount integer NOT NULL DEFAULT 30,
  delay_unit text NOT NULL DEFAULT 'MINUTES',
  message_mode text NOT NULL DEFAULT 'AI',
  fixed_message text,
  step_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_followup_steps TO authenticated;
GRANT ALL ON public.crm_followup_steps TO service_role;
ALTER TABLE public.crm_followup_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage followup steps" ON public.crm_followup_steps
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_crm_followup_rules_updated_at BEFORE UPDATE ON public.crm_followup_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_crm_followup_steps_updated_at BEFORE UPDATE ON public.crm_followup_steps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_crm_followup_steps_rule ON public.crm_followup_steps(rule_id, step_order);

ALTER TABLE public.crm_followups ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES public.crm_followup_rules(id) ON DELETE SET NULL;
ALTER TABLE public.crm_followups ADD COLUMN IF NOT EXISTS step_id uuid REFERENCES public.crm_followup_steps(id) ON DELETE SET NULL;
ALTER TABLE public.crm_followups ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz;