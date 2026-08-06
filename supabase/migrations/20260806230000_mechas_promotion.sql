-- Inserir a promoção de mechas se não existir
INSERT INTO public.promotions (
  code,
  title,
  service_category,
  service_name,
  promotional_price,
  status,
  channels,
  start_at,
  end_at
)
VALUES (
  'PACOTE_MECHAS_MENSAL',
  'Pacote de Mechas',
  'MECHAS',
  'Pacote de Mechas',
  289.90,
  'ACTIVE',
  ARRAY['WHATSAPP', 'WEB'],
  '2026-08-01 00:00:00+00',
  '2026-12-31 23:59:59+00'
)
ON CONFLICT (code) DO UPDATE 
SET promotional_price = 289.90,
    status = 'ACTIVE',
    end_at = '2026-12-31 23:59:59+00';

-- Garantir acesso
GRANT SELECT ON public.promotions TO authenticated, anon;
GRANT ALL ON public.promotions TO service_role;
