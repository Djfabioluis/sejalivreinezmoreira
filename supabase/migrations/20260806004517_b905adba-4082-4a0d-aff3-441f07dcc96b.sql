-- 1. Create crm_slot_opportunities table
CREATE TABLE public.crm_slot_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id TEXT NOT NULL,
    professional_id TEXT,
    service_id TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'offered', 'accepted', 'declined', 'expired', 'reserved')),
    offered_to_phone TEXT,
    offer_sent_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    ranking_data JSONB, -- For storing the ordered list of eligible customers
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_slot_opportunities TO authenticated;
GRANT ALL ON public.crm_slot_opportunities TO service_role;

-- 3. Enable RLS
ALTER TABLE public.crm_slot_opportunities ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Admins only for this engine)
CREATE POLICY "Admins can manage slot opportunities"
ON public.crm_slot_opportunities
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.crm_slot_opportunities
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
