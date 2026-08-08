-- 1. ai_sent_messages: enable RLS + policies
ALTER TABLE public.ai_sent_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.ai_sent_messages TO authenticated;
GRANT ALL ON public.ai_sent_messages TO service_role;

CREATE POLICY "Admins can read ai_sent_messages"
ON public.ai_sent_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages ai_sent_messages"
ON public.ai_sent_messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. agendamentos_notif: remove overly permissive policy
DROP POLICY IF EXISTS "Allow authenticated to manage agendamentos_notif" ON public.agendamentos_notif;

CREATE POLICY "Staff manage agendamentos_notif"
ON public.agendamentos_notif
FOR ALL
TO authenticated
USING (public.user_has_permission(auth.uid(), 'agendar'))
WITH CHECK (public.user_has_permission(auth.uid(), 'agendar'));

-- user_has_permission is used by the policy above, so authenticated must be able to execute it
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO authenticated;

-- 3. bemp_idempotency: restrict to service role / admin read only
DROP POLICY IF EXISTS "Allow authenticated to insert idempotency" ON public.bemp_idempotency;
DROP POLICY IF EXISTS "Allow authenticated to select idempotency" ON public.bemp_idempotency;

REVOKE INSERT, UPDATE, DELETE ON public.bemp_idempotency FROM authenticated;
GRANT SELECT ON public.bemp_idempotency TO authenticated;
GRANT ALL ON public.bemp_idempotency TO service_role;

CREATE POLICY "Admins can read bemp_idempotency"
ON public.bemp_idempotency
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages bemp_idempotency"
ON public.bemp_idempotency
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Fix mutable search_path on remaining functions
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_ai_messages()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.ai_sent_messages WHERE sent_at < now() - interval '48 hours';
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_old_ai_messages() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_ai_messages() TO service_role;

-- 5. has_role: restrict signed-in callers to checking only their own roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (auth.uid() IS NULL OR _user_id = auth.uid())
  )
$function$;