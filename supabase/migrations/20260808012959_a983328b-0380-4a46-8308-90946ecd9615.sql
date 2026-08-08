
-- Update crm_followups status constraint to include DELIVERED and READ
ALTER TABLE public.crm_followups DROP CONSTRAINT IF EXISTS crm_followups_status_check;

ALTER TABLE public.crm_followups ADD CONSTRAINT crm_followups_status_check 
CHECK (status = ANY (ARRAY[
    'PENDING', 'READY', 'PROCESSING', 'SENT', 'FAILED', 'CANCELED', 'PAUSED',
    'PENDENTE', 'EM_PROCESSAMENTO', 'ENVIADO', 'FALHA', 'CANCELADO', 'ENCERRADO', 'READY_TO_SEND',
    'DELIVERED', 'READ'
]));

COMMENT ON COLUMN public.crm_followups.status IS 'Status do follow-up: PENDING, READY, PROCESSING, SENT, DELIVERED, READ, FAILED, CANCELED, PAUSED';
