ALTER TABLE public.crm_customer_pipeline
  ADD COLUMN IF NOT EXISTS health_score integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'VERDE',
  ADD COLUMN IF NOT EXISTS health_recommendation text;

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  conversation_id text,
  opportunity_type text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  priority integer NOT NULL DEFAULT 0,
  trigger text,
  recommended_action text,
  status text NOT NULL DEFAULT 'PENDENTE',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crm_opportunities TO authenticated;
GRANT ALL ON public.crm_opportunities TO service_role;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view opportunities"
  ON public.crm_opportunities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_crm_opportunities_updated_at
  BEFORE UPDATE ON public.crm_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.crm_financial_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text,
  amount numeric NOT NULL DEFAULT 0,
  source text NOT NULL,
  unit_name text,
  professional_name text,
  service_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crm_financial_logs TO authenticated;
GRANT ALL ON public.crm_financial_logs TO service_role;
ALTER TABLE public.crm_financial_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view financial logs"
  ON public.crm_financial_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));