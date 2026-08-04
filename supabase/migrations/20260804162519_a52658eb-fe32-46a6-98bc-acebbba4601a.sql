-- Update check constraint for status
ALTER TABLE public.wa_agentes DROP CONSTRAINT IF EXISTS wa_agentes_status_check;
ALTER TABLE public.wa_agentes ADD CONSTRAINT wa_agentes_status_check 
CHECK (status IN ('aguardando_conexao', 'conectado_sem_unidade', 'ativo', 'inativo', 'erro_conexao', 'aguardando_qr', 'conectado', 'desconectado'));

-- Ensure wa_conversas also has the new columns if not already there (Migration was already run but good to be sure)
ALTER TABLE public.wa_conversas ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.wa_agentes(id);
ALTER TABLE public.wa_conversas ADD COLUMN IF NOT EXISTS unidade_id text;
