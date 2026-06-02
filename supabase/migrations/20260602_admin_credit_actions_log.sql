-- =============================================================================
-- Cronologia CONDIVISA delle azioni admin su crediti / like / abbonamenti
-- =============================================================================
-- Serve per monitorare chi (quale admin) ha assegnato cosa, a chi, quando e
-- perche'. Visibile a TUTTI gli admin. Si auto-pulisce: vengono mostrate solo
-- le voci delle ultime 24 ore, e ogni inserimento elimina quelle piu' vecchie.
--
-- Accesso SOLO admin: la tabella ha RLS attiva senza policy dirette; si entra
-- esclusivamente tramite le due funzioni SECURITY DEFINER qui sotto, che
-- verificano il ruolo admin. L'email dell'admin viene presa dal server
-- (auth.users), quindi non e' falsificabile dal client.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_credit_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       uuid,
  admin_email    text,
  action_label   text NOT NULL,
  target_user_id text NOT NULL,
  reason         text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_credit_actions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_credit_actions_created
  ON public.admin_credit_actions (created_at DESC);

-- LOG: registra un'azione (solo admin). Cattura l'email dal server.
CREATE OR REPLACE FUNCTION public.log_admin_credit_action(
  p_action_label   text,
  p_target_user_id text,
  p_reason         text
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

  -- pulizia automatica: via le voci piu' vecchie di 24 ore
  DELETE FROM admin_credit_actions WHERE created_at < now() - interval '24 hours';

  INSERT INTO admin_credit_actions (admin_id, admin_email, action_label, target_user_id, reason)
  VALUES (auth.uid(), v_email, p_action_label, p_target_user_id, p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_credit_action(text, text, text) TO authenticated;

-- READ: cronologia ultime 24 ore (solo admin).
CREATE OR REPLACE FUNCTION public.get_admin_credit_actions()
RETURNS TABLE (
  id             uuid,
  admin_email    text,
  action_label   text,
  target_user_id text,
  reason         text,
  created_at     timestamptz
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
    SELECT a.id, a.admin_email, a.action_label, a.target_user_id, a.reason, a.created_at
    FROM admin_credit_actions a
    WHERE a.created_at >= now() - interval '24 hours'
    ORDER BY a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_credit_actions() TO authenticated;
