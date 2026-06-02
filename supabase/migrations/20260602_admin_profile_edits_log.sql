-- =============================================================================
-- Cronologia CONDIVISA delle modifiche ai profili admin (Gestione Profili)
-- =============================================================================
-- Registra, ad ogni "Salva Modifiche", chi (admin) ha modificato quale profilo,
-- quando e cosa esattamente (campi cambiati, foto aggiunte/rimosse, canzoni,
-- interessi, ecc.). Visibile a tutti gli admin per monitoraggio.
-- Email admin presa dal server (non falsificabile). Accesso solo admin.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_profile_edits (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id         uuid,
  admin_email      text,
  profile_id       uuid,
  profile_nickname text,
  changes          text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_profile_edits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_profile_edits_created
  ON public.admin_profile_edits (created_at DESC);

-- LOG: registra una modifica (solo admin). Email presa dal server.
CREATE OR REPLACE FUNCTION public.log_profile_edit(
  p_profile_id       uuid,
  p_profile_nickname text,
  p_changes          text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO admin_profile_edits (admin_id, admin_email, profile_id, profile_nickname, changes)
  VALUES (auth.uid(), v_email, p_profile_id, p_profile_nickname, p_changes);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_profile_edit(uuid, text, text) TO authenticated;

-- READ: cronologia modifiche (solo admin), ultimi 60 giorni.
CREATE OR REPLACE FUNCTION public.get_profile_edits()
RETURNS TABLE (
  id               uuid,
  admin_email      text,
  profile_nickname text,
  changes          text,
  created_at       timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  RETURN QUERY
    SELECT a.id, a.admin_email, a.profile_nickname, a.changes, a.created_at
    FROM admin_profile_edits a
    WHERE a.created_at >= now() - interval '60 days'
    ORDER BY a.created_at DESC
    LIMIT 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_edits() TO authenticated;
