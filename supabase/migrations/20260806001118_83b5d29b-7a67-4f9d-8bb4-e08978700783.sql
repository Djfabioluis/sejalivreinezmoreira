
-- Add PROFESSIONAL_UNAVAILABLE, SATURDAY_FULL, and PRICE to the enum if we were using one, 
-- but since abandonment_reason is a text field in the previous implementations, we just need to ensure the logic handles them.
-- We'll create the recovery table to track automated recovery attempts.

CREATE TABLE IF NOT EXISTS public.crm_recoveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone text NOT NULL,
    conversation_id uuid,
    reason text NOT NULL, -- PROFESSIONAL_UNAVAILABLE, SATURDAY_FULL, etc.
    status text NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, ENVIADO, FALHA, CONVERTIDO
    metadata jsonb DEFAULT '{}'::jsonb,
    scheduled_at timestamptz DEFAULT now(),
    sent_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_recoveries TO authenticated;
GRANT ALL ON public.crm_recoveries TO service_role;

ALTER TABLE public.crm_recoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recoveries"
ON public.crm_recoveries
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
