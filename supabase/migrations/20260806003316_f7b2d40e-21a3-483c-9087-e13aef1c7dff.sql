CREATE TABLE public.crm_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    confidence INTEGER NOT NULL DEFAULT 50,
    status TEXT NOT NULL DEFAULT 'PENDENTE',
    suggested_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_recommendations TO authenticated;
GRANT ALL ON public.crm_recommendations TO service_role;

ALTER TABLE public.crm_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recommendations"
    ON public.crm_recommendations
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.crm_recommendations IS 'Armazena recomendações geradas pela IA Comercial após atendimentos.';