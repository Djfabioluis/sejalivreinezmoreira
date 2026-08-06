-- 1. Create Stage Enum if not exists
DO $$ BEGIN
    CREATE TYPE public.crm_pipeline_stage AS ENUM (
        'NOVO_CONTATO',
        'IDENTIFICANDO_SERVICO',
        'ESCOLHENDO_UNIDADE',
        'ESCOLHENDO_PROFISSIONAL',
        'ESCOLHENDO_DATA',
        'ESCOLHENDO_HORARIO',
        'AGUARDANDO_CONFIRMACAO',
        'AGENDADO',
        'ATENDIDO',
        'CANCELADO',
        'ABANDONADO',
        'CONVERTIDO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create CRM Pipeline Table
CREATE TABLE IF NOT EXISTS public.crm_customer_pipeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT, -- References wa_conversas.phone
    customer_id TEXT,
    phone TEXT UNIQUE NOT NULL,
    customer_name TEXT,
    current_stage public.crm_pipeline_stage DEFAULT 'NOVO_CONTATO',
    last_stage public.crm_pipeline_stage,
    stage_started_at TIMESTAMPTZ DEFAULT now(),
    last_interaction_at TIMESTAMPTZ DEFAULT now(),
    followup_status TEXT,
    followup_attempts INTEGER DEFAULT 0,
    conversion_score INTEGER DEFAULT 0,
    lost_reason TEXT,
    abandonment_reason TEXT,
    next_action TEXT,
    next_action_at TIMESTAMPTZ,
    assigned_operator UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add Index for performance on the phone column used by abandonment detector
CREATE INDEX IF NOT EXISTS idx_crm_pipeline_phone ON public.crm_customer_pipeline(phone);

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customer_pipeline TO authenticated;
GRANT ALL ON public.crm_customer_pipeline TO service_role;

-- 5. RLS
ALTER TABLE public.crm_customer_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Operators can read CRM"
ON public.crm_customer_pipeline
FOR SELECT
TO authenticated
USING (true); -- Broad read for operators as requested in past turns

CREATE POLICY "Service role full access"
ON public.crm_customer_pipeline
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Update Customer Pipeline RPC
CREATE OR REPLACE FUNCTION public.update_customer_pipeline(
  p_phone TEXT,
  p_conversation_id TEXT DEFAULT NULL,
  p_stage public.crm_pipeline_stage DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_next_action TEXT DEFAULT NULL,
  p_next_action_at TIMESTAMPTZ DEFAULT NULL,
  p_abandonment_reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.crm_customer_pipeline (
    phone,
    conversation_id,
    current_stage,
    customer_name,
    next_action,
    next_action_at,
    abandonment_reason,
    last_interaction_at
  )
  VALUES (
    p_phone,
    p_conversation_id,
    p_stage,
    p_customer_name,
    p_next_action,
    p_next_action_at,
    p_abandonment_reason,
    now()
  )
  ON CONFLICT (phone) DO UPDATE SET
    conversation_id = COALESCE(p_conversation_id, crm_customer_pipeline.conversation_id),
    last_stage = CASE 
      WHEN p_stage IS NOT NULL AND p_stage <> crm_customer_pipeline.current_stage 
      THEN crm_customer_pipeline.current_stage 
      ELSE crm_customer_pipeline.last_stage 
    END,
    current_stage = COALESCE(p_stage, crm_customer_pipeline.current_stage),
    stage_started_at = CASE 
      WHEN p_stage IS NOT NULL AND p_stage <> crm_customer_pipeline.current_stage 
      THEN now() 
      ELSE crm_customer_pipeline.stage_started_at 
    END,
    customer_name = COALESCE(p_customer_name, crm_customer_pipeline.customer_name),
    next_action = COALESCE(p_next_action, crm_customer_pipeline.next_action),
    next_action_at = COALESCE(p_next_action_at, crm_customer_pipeline.next_action_at),
    abandonment_reason = COALESCE(p_abandonment_reason, crm_customer_pipeline.abandonment_reason),
    last_interaction_at = now(),
    updated_at = now();
END;
$$;
