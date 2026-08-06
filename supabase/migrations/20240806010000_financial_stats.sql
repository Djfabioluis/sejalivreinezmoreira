-- Adicionar colunas financeiras e de rastreio à tabela crm_slot_opportunities
ALTER TABLE public.crm_slot_opportunities 
ADD COLUMN IF NOT EXISTS estimated_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_name text,
ADD COLUMN IF NOT EXISTS unit_name text,
ADD COLUMN IF NOT EXISTS professional_name text,
ADD COLUMN IF NOT EXISTS filled_at timestamptz;

-- Adicionar colunas financeiras ao pipeline para ticket médio e receita perdida
ALTER TABLE public.crm_customer_pipeline
ADD COLUMN IF NOT EXISTS estimated_ltv numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_service_value numeric DEFAULT 0;

-- Tabela para rastrear receita por atendimento (simulado/cacheado do BEMP)
CREATE TABLE IF NOT EXISTS public.crm_financial_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    phone text NOT NULL,
    amount numeric NOT NULL,
    service_name text,
    unit_name text,
    professional_name text,
    source text DEFAULT 'BEMP', -- 'BEMP', 'REVENUE_ENGINE', 'FOLLOW_UP'
    opportunity_id uuid REFERENCES public.crm_slot_opportunities(id)
);

GRANT SELECT, INSERT ON public.crm_financial_logs TO authenticated;
GRANT ALL ON public.crm_financial_logs TO service_role;

ALTER TABLE public.crm_financial_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage financial logs" 
ON public.crm_financial_logs 
FOR ALL 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Comentários para documentação
COMMENT ON COLUMN public.crm_slot_opportunities.filled_at IS 'Quando o cancelamento foi preenchido por outro cliente';
