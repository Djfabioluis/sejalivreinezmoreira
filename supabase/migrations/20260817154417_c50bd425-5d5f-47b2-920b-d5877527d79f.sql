-- Migration: Add Admin Portal Tables
-- Description: Adds tables for contracts, manuals, notifications and audit logs for the admin portal.

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE public.contract_status AS ENUM (
        'NAO_GERADO',
        'AGUARDANDO_ASSINATURA',
        'ASSINATURA_EM_VALIDACAO',
        'ASSINADO',
        'CANCELADO',
        'ENCERRADO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.manual_status AS ENUM ('RASCUNHO', 'PUBLICADO', 'ARQUIVADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLES

-- Professional Profiles (Extension of auth.users/public.profiles)
CREATE TABLE IF NOT EXISTS public.professional_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    cpf TEXT UNIQUE,
    rg TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    cep TEXT,
    modality TEXT, -- e.g., 'Cabeleireiro', 'Manicure'
    professional_percentage NUMERIC(5,2),
    salon_percentage NUMERIC(5,2),
    status TEXT DEFAULT 'ATIVO', -- 'ATIVO', 'INATIVO', 'BLOQUEADO'
    last_access_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_profiles TO authenticated;
GRANT ALL ON public.professional_profiles TO service_role;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on professional_profiles"
    ON public.professional_profiles
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see their own profile"
    ON public.professional_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Contracts
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    contract_number TEXT UNIQUE NOT NULL,
    modality TEXT NOT NULL,
    professional_percentage NUMERIC(5,2) NOT NULL,
    salon_percentage NUMERIC(5,2) NOT NULL,
    status public.contract_status DEFAULT 'NAO_GERADO',
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    signature_deadline TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on contracts"
    ON public.contracts
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see their own contracts"
    ON public.contracts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = professional_id);

-- Contract Files (Storage References)
CREATE TABLE IF NOT EXISTS public.contract_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL, -- 'ORIGINAL', 'SIGNED'
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_files TO authenticated;
GRANT ALL ON public.contract_files TO service_role;
ALTER TABLE public.contract_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on contract_files"
    ON public.contract_files
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Contract Events (Timeline)
CREATE TABLE IF NOT EXISTS public.contract_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_events TO authenticated;
GRANT ALL ON public.contract_events TO service_role;
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on contract_events"
    ON public.contract_events
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Employee Manuals
CREATE TABLE IF NOT EXISTS public.employee_manuals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    content TEXT,
    pdf_storage_path TEXT,
    status public.manual_status DEFAULT 'RASCUNHO',
    created_by UUID REFERENCES auth.users(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_manuals TO authenticated;
GRANT ALL ON public.employee_manuals TO service_role;
ALTER TABLE public.employee_manuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on employee_manuals"
    ON public.employee_manuals
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see published manuals"
    ON public.employee_manuals
    FOR SELECT
    TO authenticated
    USING (status = 'PUBLICADO');

-- Manual Acknowledgements
CREATE TABLE IF NOT EXISTS public.employee_manual_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manual_id UUID NOT NULL REFERENCES public.employee_manuals(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(manual_id, professional_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_manual_acknowledgements TO authenticated;
GRANT ALL ON public.employee_manual_acknowledgements TO service_role;
ALTER TABLE public.employee_manual_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can see all acknowledgements"
    ON public.employee_manual_acknowledgements
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Notifications
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notifications TO authenticated;
GRANT ALL ON public.admin_notifications TO service_role;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on admin_notifications"
    ON public.admin_notifications
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can see audit logs"
    ON public.admin_audit_logs
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));