-- Migration to create crm_opportunities table
CREATE TYPE public.opportunity_type AS ENUM (
  'ABANDONED_BOOKING',
  'RETURN_REMINDER',
  'BIRTHDAY',
  'PLAN_AVAILABLE',
  'EMPTY_SLOT',
  'VIP_CUSTOMER',
  'REBOOK',
  'WAITING_LIST',
  'UPSELL',
  'CROSS_SELL'
);

CREATE TYPE public.opportunity_status AS ENUM (
  'PENDENTE',
  'APROVADO',
  'REJEITADO',
  'EXECUTADO',
  'FALHA'
);

CREATE TABLE public.crm_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT, -- Phone or Bemp ID
  conversation_id TEXT,
  unit_id TEXT,
  opportunity_type public.opportunity_type NOT NULL,
  priority INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  status public.opportunity_status DEFAULT 'PENDENTE',
  trigger TEXT,
  recommended_action TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_opportunities TO authenticated;
GRANT ALL ON public.crm_opportunities TO service_role;

-- Enable RLS
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage opportunities"
ON public.crm_opportunities
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

