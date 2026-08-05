
-- Migração para garantir limpeza atômica no transfer_conversation_unit
-- Versão 20260805014000

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
  v_requested_service_name text;
begin
  -- Busca dados atuais
  select unidade_id, customer_context
  into v_old_unit_id, v_customer_context
  from public.wa_conversas
  where phone = p_conversation_phone;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Conversa não encontrada');
  end if;

  -- 1. Extrair nome do serviço solicitado (requestedService) para preservar
  v_requested_service_name = v_customer_context->>'requestedService';
  -- Se requestedService for um objeto {id, name}, tenta pegar o nome
  if v_requested_service_name is null then
     v_requested_service_name = v_customer_context->'requestedService'->>'name';
     if v_requested_service_name is null then
        v_requested_service_name = v_customer_context->'requestedService'->>'nome';
     end if;
  end if;

  -- 2. Construir novo contexto LIMPO
  -- Preservamos apenas requestedService (nome textual) e injetamos a nova unidade
  v_customer_context = jsonb_build_object(
    'currentUnitId', p_target_unit_id,
    'requestedService', v_requested_service_name
  );

  -- 3. Atualiza a conversa atomicamente
  update public.wa_conversas
  set 
    unidade_id = p_target_unit_id,
    previous_unit_id = v_old_unit_id,
    origin_unit_id = coalesce(origin_unit_id, v_old_unit_id),
    transferred_at = now(),
    transferred_by = p_user_id,
    transfer_reason = p_reason,
    customer_context = v_customer_context,
    updated_at = now(),
    status = 'aberta' -- garante que a conversa reabra para a IA reprocessar
  where phone = p_conversation_phone;

  v_result = jsonb_build_object(
    'success', true, 
    'old_unit_id', v_old_unit_id, 
    'new_unit_id', p_target_unit_id,
    'transferred_at', now(),
    'context_cleaned', true
  );

  return v_result;
exception when others then
  return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;
