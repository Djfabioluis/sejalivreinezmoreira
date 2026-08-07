UPDATE public.base_conhecimento
SET conteudo = conteudo || E'\n\nPROMOÇÕES ATIVAS E CONFIRMADAS:\n{{active_promotions_block}}',
    updated_at = now()
WHERE id = 1
  AND conteudo NOT LIKE '%{{active_promotions_block}}%';

UPDATE public.base_conhecimento
SET conteudo = REPLACE(
    conteudo, 
    'Para identificar assinantes, utilize exclusivamente o telefone cadastrado na assinatura. CPF nunca deve ser solicitado, em nenhuma hipótese, nem como primeira nem como segunda tentativa.',
    'Para identificar assinantes, utilize EXCLUSIVAMENTE o telefone cadastrado. NUNCA mencione a palavra "CPF" ou solicite qualquer documento de identificação nacional. Se precisar localizar um plano, peça o telefone com DDD. Se o cliente enviar o CPF espontaneamente, ignore-o e peça o telefone.'
)
WHERE id = 1;