-- Migration to create crm_waiting_list table
CREATE TABLE public.crm_waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL, -- Phone or Bemp ID
  customer_name TEXT,
  unit_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  professional_id TEXT, -- Optional preference
  preferred_period TEXT, -- 'MANHA', 'TARDE', 'NOITE', 'QUALQUER'
  preferred_days JSONB, -- ['SEG', 'TER', ...]
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'FULFILLED', 'CANCELLED'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_waiting_list TO authenticated;
GRANT ALL ON public.crm_waiting_list TO service_role;

-- Enable RLS
ALTER TABLE public.crm_waiting_list ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage waiting list"
ON public.crm_waiting_list
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Index for searching
CREATE INDEX idx_waiting_list_lookup ON public.crm_waiting_list (unit_id, service_id, status);
