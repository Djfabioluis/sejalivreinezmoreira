-- 1. Memória permanente do cliente
CREATE TABLE public.customer_ai_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_key text NOT NULL DEFAULT 'default',
  bemp_customer_id text,
  phone_normalized text NOT NULL,
  phone_number text,
  contact_name text,
  preferred_name text,
  preferred_unit_id text,
  preferred_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_professionals jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferred_times jsonb NOT NULL DEFAULT '[]'::jsonb,
  communication_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  restrictions jsonb NOT NULL DEFAULT '[]'::jsonb,
  subscription_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  appointment_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  important_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  field_sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  memory_summary text,
  memory_version integer NOT NULL DEFAULT 1,
  confidence_score numeric NOT NULL DEFAULT 0,
  last_interaction_at timestamp with time zone,
  anonymized_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX customer_ai_memory_org_phone_key
  ON public.customer_ai_memory (org_key, phone_normalized);
CREATE UNIQUE INDEX customer_ai_memory_org_customer_key
  ON public.customer_ai_memory (org_key, bemp_customer_id)
  WHERE bemp_customer_id IS NOT NULL;
CREATE INDEX customer_ai_memory_last_interaction_idx
  ON public.customer_ai_memory (last_interaction_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_ai_memory TO authenticated;
GRANT ALL ON public.customer_ai_memory TO service_role;
ALTER TABLE public.customer_ai_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage customer_ai_memory" ON public.customer_ai_memory
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff read customer_ai_memory" ON public.customer_ai_memory
  FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'aprendizado-ia'));

CREATE TRIGGER trg_customer_ai_memory_updated_at
  BEFORE UPDATE ON public.customer_ai_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Histórico de versões da memória
CREATE TABLE public.customer_ai_memory_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id uuid NOT NULL REFERENCES public.customer_ai_memory(id) ON DELETE CASCADE,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  change_reason text,
  changed_by uuid REFERENCES auth.users(id),
  changed_by_source text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX customer_ai_memory_versions_memory_idx
  ON public.customer_ai_memory_versions (memory_id, version DESC);

GRANT SELECT, INSERT, DELETE ON public.customer_ai_memory_versions TO authenticated;
GRANT ALL ON public.customer_ai_memory_versions TO service_role;
ALTER TABLE public.customer_ai_memory_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage memory versions" ON public.customer_ai_memory_versions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff read memory versions" ON public.customer_ai_memory_versions
  FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'aprendizado-ia'));

-- 3. Sugestões para a base de conhecimento global
CREATE TABLE public.knowledge_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_conversation_id text,
  category text NOT NULL DEFAULT 'geral',
  title text NOT NULL,
  suggested_content text NOT NULL,
  evidence_summary text,
  occurrence_count integer NOT NULL DEFAULT 1,
  confidence_score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT knowledge_suggestions_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'published'))
);

CREATE INDEX knowledge_suggestions_status_idx
  ON public.knowledge_suggestions (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_suggestions TO authenticated;
GRANT ALL ON public.knowledge_suggestions TO service_role;
ALTER TABLE public.knowledge_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage knowledge_suggestions" ON public.knowledge_suggestions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff read knowledge_suggestions" ON public.knowledge_suggestions
  FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'aprendizado-ia'));

CREATE TRIGGER trg_knowledge_suggestions_updated_at
  BEFORE UPDATE ON public.knowledge_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Feedback das respostas da IA
CREATE TABLE public.ai_response_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id text,
  message_id text,
  response_id text,
  rating integer,
  feedback_type text NOT NULL DEFAULT 'other',
  corrected_answer text,
  operator_notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_response_feedback_type_check CHECK (
    feedback_type IN (
      'helpful','incorrect','repetitive','wrong_unit','wrong_professional',
      'wrong_service','wrong_plan','formatting_issue','duplicate_response','other'
    )
  ),
  CONSTRAINT ai_response_feedback_rating_check CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

CREATE INDEX ai_response_feedback_created_idx
  ON public.ai_response_feedback (created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_response_feedback TO authenticated;
GRANT ALL ON public.ai_response_feedback TO service_role;
ALTER TABLE public.ai_response_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_response_feedback" ON public.ai_response_feedback
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff read ai_response_feedback" ON public.ai_response_feedback
  FOR SELECT TO authenticated
  USING (public.user_has_permission(auth.uid(), 'aprendizado-ia'));

CREATE POLICY "Staff insert ai_response_feedback" ON public.ai_response_feedback
  FOR INSERT TO authenticated
  WITH CHECK (public.user_has_permission(auth.uid(), 'aprendizado-ia'));

-- 5. Nova permissão "aprendizado-ia" para administradores
CREATE OR REPLACE FUNCTION public.get_my_permissoes()
 RETURNS text[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  perms text[];
BEGIN
  IF uid IS NULL THEN RETURN ARRAY[]::text[]; END IF;
  IF public.has_role(uid, 'admin') THEN
    RETURN ARRAY['painel','agendar','bemp','base-conhecimento','boas-vindas','operadores','sugestoes','auditoria-sugestoes','integracao-bemp','acessos','usuarios','assinantes','permissoes','aprendizado-ia'];
  END IF;
  SELECT permissoes INTO perms FROM public.operador_permissoes WHERE user_id = uid;
  IF perms IS NULL THEN
    SELECT permissoes INTO perms FROM public.operador_permissoes_default WHERE id = 1;
  END IF;
  RETURN COALESCE(perms, ARRAY[]::text[]);
END;
$function$;