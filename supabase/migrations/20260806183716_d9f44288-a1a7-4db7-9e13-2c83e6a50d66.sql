
-- Criação da tabela de promoções centralizada
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    unit_id TEXT,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    service_category TEXT,
    service_name TEXT,
    promotional_price DECIMAL(10, 2),
    original_price DECIMAL(10, 2),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    channels TEXT[] DEFAULT '{WHATSAPP}',
    priority INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Permissões
GRANT SELECT ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

-- RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on active promotions"
    ON public.promotions FOR SELECT
    TO authenticated
    USING (
        status = 'ACTIVE' AND 
        start_at <= now() AND 
        end_at >= now()
    );

-- Inserção da promoção do Pacote de Mechas
INSERT INTO public.promotions (
    code,
    title,
    description,
    service_category,
    service_name,
    promotional_price,
    start_at,
    end_at,
    status,
    channels
) VALUES (
    'PACOTE_MECHAS_MENSAL',
    'Pacote de Mechas',
    'Promoção especial de mechas para o mês de agosto',
    'MECHAS',
    'Pacote de Mechas',
    289.90,
    '2026-08-01 00:00:00-03',
    '2026-08-31 23:59:59-03',
    'ACTIVE',
    '{WHATSAPP}'
) ON CONFLICT (code) DO UPDATE SET
    promotional_price = EXCLUDED.promotional_price,
    start_at = EXCLUDED.start_at,
    end_at = EXCLUDED.end_at,
    status = EXCLUDED.status;
