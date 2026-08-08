SELECT cron.unschedule(10);
SELECT cron.unschedule(11);

SELECT cron.schedule('crm-cron-job', '*/5 * * * *', 
  $$SELECT net.http_get(
    url := 'https://project--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/crm-cron',
    headers := '{"Authorization": "Bearer aeeecf52af26fa2b57be9eaf5de16b38418d8f152dd714467df1e862bd4c6b51"}'::jsonb
  );$$
);

SELECT cron.schedule('lembretes-whatsapp-hourly', '0 * * * *', 
  $$SELECT net.http_get(
    url := 'https://project--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/hooks/lembretes',
    headers := '{"Authorization": "Bearer aeeecf52af26fa2b57be9eaf5de16b38418d8f152dd714467df1e862bd4c6b51"}'::jsonb
  );$$
);