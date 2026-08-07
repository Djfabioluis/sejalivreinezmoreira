-- Ativando as extensões necessárias (se não estiverem ativas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Agendamento para o CRM (Follow-ups) - a cada 15 minutos
-- Usamos o domínio fixo e o CRON_SECRET do vault
SELECT cron.schedule(
  'crm-cron-job',
  '*/15 * * * *',
  $$
  SELECT net.http_get(
    url := (SELECT 'https://' || (SELECT 'project--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app') || '/api/public/crm-cron'),
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT value FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Agendamento para Lembretes de WhatsApp - a cada hora
SELECT cron.schedule(
  'lembretes-whatsapp-hourly',
  '0 * * * *',
  $$
  SELECT net.http_get(
    url := (SELECT 'https://' || (SELECT 'project--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app') || '/api/public/hooks/lembretes'),
    headers := jsonb_build_object(
      'x-cron-secret', (SELECT value FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1),
      'Content-Type', 'application/json'
    )
  );
  $$
);