UPDATE public.base_conhecimento
SET conteudo = REPLACE(REPLACE(conteudo, 'pacientes', 'clientes'), 'paciente', 'cliente'),
    updated_at = now()
WHERE id = 1;

UPDATE public.base_conhecimento
SET conteudo = REPLACE(REPLACE(conteudo, 'Pacientes', 'Clientes'), 'Paciente', 'Cliente'),
    updated_at = now()
WHERE id = 1;