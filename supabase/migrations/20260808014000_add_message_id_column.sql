-- Add message_id column to crm_followups for faster lookups from webhooks
ALTER TABLE public.crm_followups ADD COLUMN IF NOT EXISTS message_id TEXT;
CREATE INDEX IF NOT EXISTS idx_crm_followups_message_id ON public.crm_followups(message_id);

-- Update status constraint to include DELIVERED and READ (already handled in previous migration but ensuring consistency)
ALTER TABLE public.crm_followups DROP CONSTRAINT IF EXISTS crm_followups_status_check;

ALTER TABLE public.crm_followups ADD CONSTRAINT crm_followups_status_check 
CHECK (status = ANY (ARRAY[
    'PENDING', 'READY', 'PROCESSING', 'SENT', 'FAILED', 'CANCELED', 'PAUSED',
    'PENDENTE', 'EM_PROCESSAMENTO', 'ENVIADO', 'FALHA', 'CANCELADO', 'ENCERRADO', 'READY_TO_SEND',
    'DELIVERED', 'READ'
]));
