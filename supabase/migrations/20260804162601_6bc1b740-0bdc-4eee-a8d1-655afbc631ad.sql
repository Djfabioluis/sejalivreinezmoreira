-- Update wa_conversas status check
ALTER TABLE public.wa_conversas DROP CONSTRAINT IF EXISTS wa_conversas_status_check;
ALTER TABLE public.wa_conversas ADD CONSTRAINT wa_conversas_status_check 
CHECK (status IN ('aberta', 'aguardando_cliente', 'aguardando_humano', 'resolvida', 'arquivada', 'aguardando_configuracao', 'waiting_for_unit_selection'));
