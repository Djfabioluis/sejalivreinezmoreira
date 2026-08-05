-- 1. Alter wa_conversas table
ALTER TABLE public.wa_conversas
ADD COLUMN IF NOT EXISTS origin_unit_id text,
ADD COLUMN IF NOT EXISTS transferred_at timestamptz,
ADD COLUMN IF NOT EXISTS transferred_by uuid,
ADD COLUMN IF NOT EXISTS transfer_reason text,
ADD COLUMN IF NOT EXISTS previous_unit_id text;

-- 2. Add foreign key for transferred_by
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wa_conversas_transferred_by_fkey') THEN
    ALTER TABLE public.wa_conversas 
    ADD CONSTRAINT wa_conversas_transferred_by_fkey 
    FOREIGN KEY (transferred_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Create indices
CREATE INDEX IF NOT EXISTS idx_wa_conversas_origin_unit_id ON public.wa_conversas (origin_unit_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_transferred_at ON public.wa_conversas (transferred_at);

-- 4. GRANT access to columns (PostgREST needs this)
GRANT SELECT, UPDATE ON public.wa_conversas TO authenticated;
GRANT ALL ON public.wa_conversas TO service_role;

-- 5. Create transfer function
CREATE OR REPLACE FUNCTION public.transfer_conversation_unit(
  p_conversation_phone text,
  p_target_unit_id text,
  p_user_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv record;
  v_old_unit_id text;
BEGIN
  -- Get conversation and lock row
  SELECT * INTO v_conv FROM wa_conversas WHERE phone = p_conversation_phone FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Conversa não encontrada');
  END IF;

  v_old_unit_id := v_conv.unidade_id;

  -- Validate same unit
  IF v_old_unit_id = p_target_unit_id THEN
    RETURN json_build_object('success', true, 'message', 'Já está na unidade solicitada', 'idempotent', true);
  END IF;

  -- Perform atomic update
  UPDATE wa_conversas
  SET 
    unidade_id = p_target_unit_id,
    previous_unit_id = v_old_unit_id,
    origin_unit_id = COALESCE(origin_unit_id, v_old_unit_id),
    transferred_at = now(),
    transferred_by = p_user_id,
    transfer_reason = p_reason,
    customer_context = customer_context || jsonb_build_object(
      'currentUnitId', p_target_unit_id,
      'transferCompletedAt', now()
    ) - 'transferRequested' - 'requestedUnitId'
  WHERE phone = p_conversation_phone;

  RETURN json_build_object(
    'success', true, 
    'old_unit_id', v_old_unit_id, 
    'new_unit_id', p_target_unit_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_conversation_unit TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_conversation_unit TO service_role;
