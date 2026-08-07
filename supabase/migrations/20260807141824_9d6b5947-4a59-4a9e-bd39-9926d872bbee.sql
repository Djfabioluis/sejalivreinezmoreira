-- Update crm_followups status constraint
ALTER TABLE public.crm_followups DROP CONSTRAINT IF EXISTS crm_followups_status_check;

ALTER TABLE public.crm_followups ADD CONSTRAINT crm_followups_status_check 
CHECK (status = ANY (ARRAY[
    'PENDING', 'READY', 'PROCESSING', 'SENT', 'FAILED', 'CANCELED', 'PAUSED',
    'PENDENTE', 'EM_PROCESSAMENTO', 'ENVIADO', 'FALHA', 'CANCELADO', 'ENCERRADO', 'READY_TO_SEND'
]));

-- Standardize existing stuck records
UPDATE public.crm_followups 
SET status = 'PENDING' 
WHERE status = 'EM_PROCESSAMENTO' OR status = 'PROCESSING';

-- Grant permissions just in case
GRANT ALL ON public.crm_followups TO authenticated, service_role;
GRANT SELECT ON public.crm_followups TO anon;
