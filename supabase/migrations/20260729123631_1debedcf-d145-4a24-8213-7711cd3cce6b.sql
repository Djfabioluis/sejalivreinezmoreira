CREATE TABLE public.reagendamentos_hist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_appointment_id text,
  new_appointment_id text,
  salon_id text,
  service_id text,
  service_name text,
  professional_id text,
  old_start timestamptz,
  new_start timestamptz NOT NULL,
  phone text NOT NULL,
  name text,
  status text NOT NULL,
  warning text,
  message_text text,
  message_sent boolean NOT NULL DEFAULT false,
  message_sent_at timestamptz,
  sandbox boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reagendamentos_hist_phone_idx ON public.reagendamentos_hist (phone);
CREATE INDEX reagendamentos_hist_created_at_idx ON public.reagendamentos_hist (created_at DESC);

GRANT ALL ON public.reagendamentos_hist TO service_role;
ALTER TABLE public.reagendamentos_hist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages reagendamentos_hist"
ON public.reagendamentos_hist
FOR ALL TO service_role
USING (true) WITH CHECK (true);