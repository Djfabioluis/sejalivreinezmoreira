-- Permitir customer_id nulo para recomendações gerais
ALTER TABLE public.crm_recommendations
ALTER COLUMN customer_id DROP NOT NULL;

-- Adicionar colunas faltantes para campanhas gerais se não existirem
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'crm_recommendations' AND COLUMN_NAME = 'unit_id') THEN
        ALTER TABLE public.crm_recommendations ADD COLUMN unit_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'crm_recommendations' AND COLUMN_NAME = 'campaign_name') THEN
        ALTER TABLE public.crm_recommendations ADD COLUMN campaign_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'crm_recommendations' AND COLUMN_NAME = 'target_audience') THEN
        ALTER TABLE public.crm_recommendations ADD COLUMN target_audience TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'crm_recommendations' AND COLUMN_NAME = 'service_focus') THEN
        ALTER TABLE public.crm_recommendations ADD COLUMN service_focus TEXT;
    END IF;
END $$;

-- Padronizar status
UPDATE public.crm_recommendations SET status = 'PENDING' WHERE status IN ('PENDENTE', 'pending');
UPDATE public.crm_recommendations SET status = 'APPROVED' WHERE status IN ('APROVADO', 'approved');
UPDATE public.crm_recommendations SET status = 'REJECTED' WHERE status IN ('REJEITADO', 'rejected');
UPDATE public.crm_recommendations SET status = 'PUBLISHED' WHERE status IN ('PUBLICADO', 'published');

-- Adicionar CHECK constraint para status se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_recommendations_status_check') THEN
        ALTER TABLE public.crm_recommendations ADD CONSTRAINT crm_recommendations_status_check CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED'));
    END IF;
END $$;
