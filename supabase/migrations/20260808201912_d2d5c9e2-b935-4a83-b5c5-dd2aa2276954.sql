UPDATE public.base_conhecimento 
SET conteudo = replace(
  replace(
    conteudo, 
    '- Restrição: Unidade Centro Cívico não aceita planos.', 
    ''
  ),
  '- Restrição: Unidade Centro Cívico não aceita planos de assinatura.',
  ''
)
WHERE id = 1;
