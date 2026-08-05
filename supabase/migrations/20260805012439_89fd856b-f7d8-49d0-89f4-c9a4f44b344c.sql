-- Migration for Unit Transfer Features
ALTER TABLE public.wa_conversas ADD COLUMN IF NOT EXISTS origin_unit_id text;
ALTER TABLE public.wa_conversas ADD COLUMN IF NOT EXISTS transferred_at timestamptz;
ALTER TABLE public.wa_conversas ADD COLUMN IF NOT EXISTS transferred_by uuid;
ALTER TABLE public.wa_conversas ADD COLUMN IF NOT EXISTS transfer_reason text;
ALTER TABLE public.wa_conversas ADD COLUMN IF NOT EXISTS previous_unit_id text;

-- Add indexes for better performance on transfer lookups
CREATE INDEX IF NOT EXISTS idx_wa_conversas_origin_unit_id ON public.wa_conversas (origin_unit_id);
CREATE INDEX IF NOT EXISTS idx_wa_conversas_transferred_at ON public.wa_conversas (transferred_at);

-- Update RLS and Grants (ensure authenticated users can read/write the new columns via PostgREST)
GRANT SELECT, UPDATE ON public.wa_conversas TO authenticated;
GRANT ALL ON public.wa_conversas TO service_role;

-- Create the Atomic Transfer RPC
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
  v_old_unit_id text;
BEGIN
  -- We perform the update and check if the record existed. 
  -- RLS should be bypassed by SECURITY DEFINER, but we still respect the 'phone' primary key.
  UPDATE public.wa_conversas
  SET 
    unidade_id = p_target_unit_id,
    previous_unit_id = COALESCE(unidade_id, previous_unit_id),
    origin_unit_id = COALESCE(origin_unit_id, unidade_id),
    transferred_at = now(),
    transferred_by = p_user_id,
    transfer_reason = p_reason,
    customer_context = COALESCE(customer_context, '{}'::jsonb) || jsonb_build_object(
      'currentUnitId', p_target_unit_id,
      'transferCompletedAt', now()
    ) - 'transferRequested' - 'requestedUnitId'
  WHERE phone = p_conversation_phone
  RETURNING previous_unit_id INTO v_old_unit_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Conversa não encontrada');
  END IF;

  RETURN json_build_object('success', true, 'new_unit_id', p_target_unit_id, 'old_unit_id', v_old_unit_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_conversation_unit TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_conversation_unit TO service_role;
