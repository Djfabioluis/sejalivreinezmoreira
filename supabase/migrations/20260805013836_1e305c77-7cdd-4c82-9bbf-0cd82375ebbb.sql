DROP FUNCTION IF EXISTS public.transfer_conversation_unit(text, text, uuid, text);
DROP FUNCTION IF EXISTS public.transfer_conversation_unit(text, text, text); -- check other signatures

create or replace function public.transfer_conversation_unit(
  p_conversation_phone text,
  p_target_unit_id text,
  p_user_id uuid default null,
  p_reason text default 'Solicitado pelo cliente via IA'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_unit_id text;
  v_customer_context jsonb;
  v_result jsonb;
begin
  -- Busca dados atuais
  select unidade_id, customer_context
  into v_old_unit_id, v_customer_context
  from public.wa_conversas
  where phone = p_conversation_phone;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Conversa não encontrada');
  end if;

  -- Se for a mesma unidade, nada a fazer
  if v_old_unit_id = p_target_unit_id then
    return jsonb_build_object('success', true, 'message', 'Já está na unidade alvo', 'idempotent', true);
  end if;

  -- Atualiza o contexto do cliente
  v_customer_context = coalesce(v_customer_context, '{}'::jsonb) || jsonb_build_object('currentUnitId', p_target_unit_id);

  -- Atualiza a conversa
  update public.wa_conversas
  set 
    unidade_id = p_target_unit_id,
    previous_unit_id = v_old_unit_id,
    origin_unit_id = coalesce(origin_unit_id, v_old_unit_id),
    transferred_at = now(),
    transferred_by = p_user_id,
    transfer_reason = p_reason,
    customer_context = v_customer_context,
    updated_at = now()
  where phone = p_conversation_phone;

  v_result = jsonb_build_object(
    'success', true, 
    'old_unit_id', v_old_unit_id, 
    'new_unit_id', p_target_unit_id,
    'transferred_at', now()
  );

  return v_result;
end;
$$;

grant execute on function public.transfer_conversation_unit(text, text, uuid, text) to authenticated;
grant execute on function public.transfer_conversation_unit(text, text, uuid, text) to service_role;
revoke execute on function public.transfer_conversation_unit(text, text, uuid, text) from public;