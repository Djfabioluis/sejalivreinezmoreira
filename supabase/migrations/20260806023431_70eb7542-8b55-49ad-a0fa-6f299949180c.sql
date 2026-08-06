ALTER TABLE public.wa_agentes
  ADD COLUMN IF NOT EXISTS status_conexao text,
  ADD COLUMN IF NOT EXISTS ia_ativa boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_connection_at timestamptz;