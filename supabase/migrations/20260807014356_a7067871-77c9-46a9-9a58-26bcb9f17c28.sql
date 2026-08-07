-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Limpar agendamentos anteriores
SELECT cron.unschedule('crm-cron-job') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crm-cron-job');
SELECT cron.unschedule('lembretes-whatsapp-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lembretes-whatsapp-hourly');

-- Agendamento CRM
SELECT cron.schedule(
  'crm-cron-job',
  '*/15 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://project--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/crm-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Agendamento Lembretes
SELECT cron.schedule(
  'lembretes-whatsapp-hourly',
  '0 * * * *',
  $$
  SELECT net.http_get(
    url := 'https://project--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/hooks/lembretes',
    headers := jsonb_build_object(
      'x-cron-secret', (SELECT value FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Atualização da Base de Conhecimento
UPDATE public.base_conhecimento 
SET conteudo = REPLACE(conteudo, 'Para identificar assinantes, utilize o telefone cadastrado na assinatura. Nunca solicite CPF. Se a primeira busca por telefone não localizar a assinatura, peça que a cliente confira e envie novamente.', 'Para identificar assinantes, utilize exclusivamente o telefone cadastrado na assinatura. CPF nunca deve ser solicitado, em nenhuma hipótese, nem como primeira nem como segunda tentativa. Se a primeira busca por telefone não localizar a assinatura, peça que a cliente confira e envie novamente.') 
WHERE id = 1;
