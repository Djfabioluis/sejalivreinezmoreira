UPDATE public.base_conhecimento 
SET conteudo = REPLACE(conteudo, 'Av. Marechal Floriano Peixoto, 45', 'Rua Marechal Floriano Peixoto, 45')
WHERE conteudo LIKE '%Av. Marechal Floriano Peixoto, 45%';

UPDATE public.base_conhecimento 
SET conteudo = REPLACE(conteudo, 'Avenida Marechal Floriano Peixoto, 45', 'Rua Marechal Floriano Peixoto, 45')
WHERE conteudo LIKE '%Avenida Marechal Floriano Peixoto, 45%';

UPDATE public.base_conhecimento 
SET conteudo = REPLACE(conteudo, '2º andar – Centro', '')
WHERE conteudo LIKE '%2º andar – Centro%';

UPDATE public.base_conhecimento 
SET conteudo = REPLACE(conteudo, '2º andar - Centro', '')
WHERE conteudo LIKE '%2º andar - Centro%';
