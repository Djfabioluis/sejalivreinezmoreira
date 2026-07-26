
CREATE TABLE public.agendamentos_notif (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bemp_appointment_id text,
  salon_id text,
  service_id text,
  service_name text,
  professional_name text,
  start_at timestamptz NOT NULL,
  phone text NOT NULL,
  name text,
  sandbox boolean NOT NULL DEFAULT false,
  confirmation_sent_at timestamptz,
  reminder_24h_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agendamentos_notif_start_at_idx ON public.agendamentos_notif (start_at);
CREATE INDEX agendamentos_notif_phone_idx ON public.agendamentos_notif (phone);
GRANT ALL ON public.agendamentos_notif TO service_role;
ALTER TABLE public.agendamentos_notif ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.agendamentos_notif FOR ALL TO service_role USING (true) WITH CHECK (true);
