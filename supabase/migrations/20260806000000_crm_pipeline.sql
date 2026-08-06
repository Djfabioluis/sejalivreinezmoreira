-- CRM Intelligent Pipeline for Julia Virtual

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

CREATE TABLE public.crm_customer_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.wa_conversas(id) ON DELETE CASCADE,
  customer_id uuid, -- Reference to a customer table if available in the future
  phone text NOT NULL, -- normalized phone: instance:remoteJid or just remoteJid? Usually phone is enough for CRM lookup
  customer_name text,
  current_stage public.crm_pipeline_stage NOT NULL DEFAULT 'NOVO_CONTATO',
  last_stage public.crm_pipeline_stage,
  stage_started_at timestamptz DEFAULT now(),
  last_interaction_at timestamptz DEFAULT now(),
  followup_status text DEFAULT 'pending',
  followup_attempts int DEFAULT 0,
  conversion_score float DEFAULT 0,
  lost_reason text,
  next_action text,
  next_action_at timestamptz,
  assigned_operator uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookup by phone/conversation
CREATE INDEX idx_crm_pipeline_phone ON public.crm_customer_pipeline(phone);
CREATE INDEX idx_crm_pipeline_conversation ON public.crm_customer_pipeline(conversation_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customer_pipeline TO authenticated;
GRANT ALL ON public.crm_customer_pipeline TO service_role;

-- RLS
ALTER TABLE public.crm_customer_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on crm_customer_pipeline"
ON public.crm_customer_pipeline
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to update pipeline state
CREATE OR REPLACE FUNCTION public.update_customer_pipeline(
  p_phone text,
  p_conversation_id uuid,
  p_stage public.crm_pipeline_stage,
  p_customer_name text DEFAULT NULL,
  p_next_action text DEFAULT NULL,
  p_next_action_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stage public.crm_pipeline_stage;
BEGIN
  -- Check existing
  SELECT current_stage INTO v_current_stage 
  FROM public.crm_customer_pipeline 
  WHERE phone = p_phone OR (p_conversation_id IS NOT NULL AND conversation_id = p_conversation_id)
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.crm_customer_pipeline
    SET 
      last_stage = CASE WHEN current_stage <> p_stage THEN current_stage ELSE last_stage END,
      current_stage = p_stage,
      customer_name = COALESCE(p_customer_name, customer_name),
      last_interaction_at = now(),
      stage_started_at = CASE WHEN current_stage <> p_stage THEN now() ELSE stage_started_at END,
      next_action = COALESCE(p_next_action, next_action),
      next_action_at = COALESCE(p_next_action_at, next_action_at),
      updated_at = now()
    WHERE phone = p_phone OR (p_conversation_id IS NOT NULL AND conversation_id = p_conversation_id);
  ELSE
    INSERT INTO public.crm_customer_pipeline (
      phone, 
      conversation_id, 
      current_stage, 
      customer_name, 
      next_action, 
      next_action_at
    )
    VALUES (
      p_phone, 
      p_conversation_id, 
      p_stage, 
      p_customer_name, 
      p_next_action, 
      p_next_action_at
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_customer_pipeline TO service_role;
