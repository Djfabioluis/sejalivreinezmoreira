-- Adicionar colunas de Customer Health Score à tabela crm_customer_pipeline
ALTER TABLE public.crm_customer_pipeline 
ADD COLUMN IF NOT EXISTS health_score integer DEFAULT 50, -- 0-100
ADD COLUMN IF NOT EXISTS health_status text DEFAULT 'AMARELO', -- 'VERDE', 'AMARELO', 'VERMELHO'
ADD COLUMN IF NOT EXISTS last_visit_at timestamptz,
ADD COLUMN IF NOT EXISTS nps_score integer,
ADD COLUMN IF NOT EXISTS total_cancellations integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS followup_response_rate numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS health_recommendations text[];

-- Comentários
COMMENT ON COLUMN public.crm_customer_pipeline.health_score IS 'Pontuação de saúde do cliente baseada em comportamento (0-100)';
COMMENT ON COLUMN public.crm_customer_pipeline.health_status IS 'Classificação visual de saúde do cliente';

-- Função para calcular health score (simplificada para rodar via RPC ou Cron)
CREATE OR REPLACE FUNCTION public.calculate_health_score(p_phone text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_score integer := 70; -- Base
    v_days_since_last_interaction integer;
    v_days_since_last_visit integer;
    v_cancellations integer;
    v_status text;
    v_recs text[] := '{}';
BEGIN
    SELECT 
        EXTRACT(DAY FROM (now() - last_interaction_at))::integer,
        EXTRACT(DAY FROM (now() - last_visit_at))::integer,
        total_cancellations
    INTO v_days_since_last_interaction, v_days_since_last_visit, v_cancellations
    FROM public.crm_customer_pipeline
    WHERE phone = p_phone;

    -- Lógica de Penalidades
    IF v_days_since_last_interaction > 30 THEN 
        v_score := v_score - 20;
        v_recs := array_append(v_recs, 'Realizar follow-up de reativação');
    END IF;
    
    IF v_cancellations > 2 THEN 
        v_score := v_score - 15;
        v_recs := array_append(v_recs, 'Cliente com alta taxa de cancelamento');
    END IF;

    IF v_days_since_last_visit > 60 THEN
        v_score := v_score - 10;
        v_recs := array_append(v_recs, 'Oferecer promoção de retorno');
    END IF;

    -- Bônus
    -- Se for VIP ou tiver plano ativo (simulado pelo conversion_score por enquanto)
    IF v_score > 0 THEN
        -- Garantir limites
        IF v_score > 100 THEN v_score := 100; END IF;
        IF v_score < 0 THEN v_score := 0; END IF;
    END IF;

    -- Classificação
    IF v_score >= 80 THEN v_status := 'VERDE';
    ELSIF v_score >= 40 THEN v_status := 'AMARELO';
    ELSE v_status := 'VERMELHO';
    END IF;

    UPDATE public.crm_customer_pipeline
    SET 
        health_score = v_score,
        health_status = v_status,
        health_recommendations = v_recs
    WHERE phone = p_phone;
END;
$$;
