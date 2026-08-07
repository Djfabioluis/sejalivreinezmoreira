CREATE TABLE public.crm_followup_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    type text NOT NULL, -- 'ABANDONMENT', 'VIP', 'BIRTHDAY', 'CUSTOM'
    enabled boolean DEFAULT true,
    delay_amount integer NOT NULL,
    delay_unit text NOT NULL, -- 'MINUTES', 'HOURS', 'DAYS'
    message_mode text NOT NULL DEFAULT 'AI', -- 'AI', 'FIXED'
    fixed_message text,
    start_time time DEFAULT '08:00',
    end_time time DEFAULT '20:00',
    max_attempts integer DEFAULT 1,
    unit_id uuid REFERENCES public.unidades(id),
    agent_id uuid REFERENCES public.wa_agentes(id),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Steps as a separate table for multi-step rules
CREATE TABLE public.crm_followup_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id uuid REFERENCES public.crm_followup_rules(id) ON DELETE CASCADE,
    delay_amount integer NOT NULL,
    delay_unit text NOT NULL,
    message_mode text NOT NULL DEFAULT 'AI',
    fixed_message text,
    step_order integer NOT NULL,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_followup_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_followup_steps TO authenticated;
GRANT ALL ON public.crm_followup_rules TO service_role;
GRANT ALL ON public.crm_followup_steps TO service_role;

ALTER TABLE public.crm_followup_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_followup_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rules" ON public.crm_followup_rules
    FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage steps" ON public.crm_followup_steps
    FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Update crm_followups to link to rules and steps
ALTER TABLE public.crm_followups ADD COLUMN rule_id uuid REFERENCES public.crm_followup_rules(id);
ALTER TABLE public.crm_followups ADD COLUMN step_id uuid REFERENCES public.crm_followup_steps(id);
ALTER TABLE public.crm_followups ADD COLUMN next_attempt_at timestamptz;
