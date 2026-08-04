-- 11. MIGRAÇÃO SEGURA

-- 1. Adicionar colunas na wa_agentes
ALTER TABLE public.wa_agentes
ADD COLUMN IF NOT EXISTS unidade_id text, -- Usando text para salon_id pois o padrão do Bemp parece ser numérico/string
ADD COLUMN IF NOT EXISTS selected_unit_at timestamptz,
ADD COLUMN IF NOT EXISTS selected_unit_by uuid;

-- 2. Adicionar colunas na wa_conversas
ALTER TABLE public.wa_conversas
ADD COLUMN IF NOT EXISTS unidade_id text,
ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.wa_agentes(id);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_wa_agentes_unidade_id ON public.wa_agentes(unidade_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_unidade_id ON public.wa_conversas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_agent_id ON public.wa_conversas(agent_id);

-- 4. Garantir Grants (O Data API precisa de acesso para as novas colunas via RLS/Select)
GRANT SELECT, UPDATE ON public.wa_agentes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wa_conversas TO authenticated;
GRANT ALL ON public.wa_agentes TO service_role;
GRANT ALL ON public.wa_conversas TO service_role;
