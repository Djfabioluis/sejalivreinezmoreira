
ALTER TABLE public.operador_permissoes
  ADD COLUMN IF NOT EXISTS unidades text[];

CREATE OR REPLACE FUNCTION public.user_can_access_unit(_user_id uuid, _unidade_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR NOT EXISTS (
      SELECT 1
      FROM public.operador_permissoes op
      WHERE op.user_id = _user_id
        AND op.unidades IS NOT NULL
        AND array_length(op.unidades, 1) > 0
    )
    OR EXISTS (
      SELECT 1
      FROM public.operador_permissoes op
      WHERE op.user_id = _user_id
        AND _unidade_id IS NOT NULL
        AND _unidade_id = ANY (op.unidades)
    );
$$;

DROP POLICY IF EXISTS "Staff can read conversations" ON public.wa_conversas;
CREATE POLICY "Staff can read conversations"
ON public.wa_conversas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    (
      user_has_permission(auth.uid(), 'agendar'::text)
      OR user_has_permission(auth.uid(), 'painel'::text)
    )
    AND public.user_can_access_unit(auth.uid(), unidade_id)
  )
);

DROP POLICY IF EXISTS "Staff can update conversations" ON public.wa_conversas;
CREATE POLICY "Staff can update conversations"
ON public.wa_conversas
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    (
      user_has_permission(auth.uid(), 'agendar'::text)
      OR user_has_permission(auth.uid(), 'painel'::text)
    )
    AND public.user_can_access_unit(auth.uid(), unidade_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    (
      user_has_permission(auth.uid(), 'agendar'::text)
      OR user_has_permission(auth.uid(), 'painel'::text)
    )
    AND public.user_can_access_unit(auth.uid(), unidade_id)
  )
);
