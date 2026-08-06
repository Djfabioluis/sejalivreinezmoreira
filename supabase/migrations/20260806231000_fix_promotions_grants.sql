-- Garantir permissões na tabela promotions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
GRANT SELECT ON public.promotions TO anon;

-- Corrigir a promoção PACOTE_MECHAS_MENSAL
INSERT INTO public.promotions (
  code, title, description, service_category, service_name, 
  promotional_price, status, channels, start_at, end_at, priority
) 
VALUES (
  'PACOTE_MECHAS_MENSAL', 
  'Pacote de Mechas', 
  'Promoção especial de mechas para o mês de agosto', 
  'MECHAS', 
  'Pacote de Mechas', 
  289.90, 
  'ACTIVE', 
  '{WHATSAPP}', 
  '2026-08-01 00:00:00+00', 
  '2026-09-01 23:59:59+00',
  100
)
ON CONFLICT (code) DO UPDATE SET
  status = 'ACTIVE',
  promotional_price = 289.90,
  start_at = '2026-08-01 00:00:00+00',
  end_at = '2026-09-01 23:59:59+00';
