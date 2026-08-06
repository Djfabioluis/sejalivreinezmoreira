
-- 1. Create crm_followups table
CREATE TABLE IF NOT EXISTS public.crm_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL, -- Link to wa_conversas via phone
    customer_id TEXT, -- Optional link to BEMP customer if known
    stage TEXT NOT NULL,
    reason TEXT,
    priority INTEGER DEFAULT 1,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_PROCESSAMENTO', 'ENVIADO', 'FALHA', 'CANCELADO', 'ENCERRADO')),
    attempts INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    message_template TEXT, -- The AI generated content
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_followups TO authenticated;
GRANT ALL ON public.crm_followups TO service_role;

-- 3. RLS
ALTER TABLE public.crm_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage followups"
ON public.crm_followups
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. RPC to handle followup lifecycle
CREATE OR REPLACE FUNCTION public.schedule_customer_followup(
    p_phone TEXT,
    p_stage TEXT,
    p_reason TEXT,
    p_scheduled_at TIMESTAMPTZ,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_attempts INTEGER;
BEGIN
    -- Check attempt limit (Max 3)
    SELECT count(*) INTO v_attempts FROM public.crm_followups 
    WHERE phone = p_phone AND stage = p_stage AND status IN ('ENVIADO', 'PENDENTE');

    IF v_attempts >= 3 THEN
        -- If we already have 3 attempts for this stage, we mark previous as ENCERRADO and don't schedule new
        UPDATE public.crm_followups SET status = 'ENCERRADO' 
        WHERE phone = p_phone AND stage = p_stage AND status = 'PENDENTE';
        RETURN NULL;
    END IF;

    INSERT INTO public.crm_followups (
        phone, stage, reason, scheduled_at, metadata
    ) VALUES (
        p_phone, p_stage, p_reason, p_scheduled_at, p_metadata
    ) RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.schedule_customer_followup TO service_role;
REVOKE EXECUTE ON FUNCTION public.schedule_customer_followup FROM public, authenticated, anon;
