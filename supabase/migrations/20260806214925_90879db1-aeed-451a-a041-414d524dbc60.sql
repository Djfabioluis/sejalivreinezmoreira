UPDATE public.base_conhecimento
SET conteudo = replace(
  conteudo,
  '- Quando o cliente informar que possui plano, solicitar o telefone cadastrado na assinatura. Nunca solicitar CPF como primeira validação.',
  '- Para identificar assinantes, utilize o telefone cadastrado na assinatura. Nunca solicite CPF. Se a primeira busca por telefone não localizar a assinatura, peça que a cliente confira e envie novamente. Se a segunda tentativa falhar, encaminhe para atendimento humano.'
),
updated_at = now()
WHERE id = 1;

UPDATE public.base_conhecimento
SET conteudo = regexp_replace(conteudo, '(?i)^.*\b(cpf|documento de identifica)\b.*$', '', 'gm'),
    updated_at = now()
WHERE (conteudo ~* '\ycpf\y' OR conteudo ~* 'documento de identifica') AND id <> 1;