ALTER TABLE public.wa_conversas
  ADD COLUMN IF NOT EXISTS human_takeover_detected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS human_takeover_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS human_transfer_message_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_human_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_pause_reason text;