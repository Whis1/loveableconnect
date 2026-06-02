-- =============================================================================
-- Sblocco pannelli protetti (Banner Pubblicitari + Template Email) per admin
-- =============================================================================
-- Ogni admin deve inserire una password UNA volta per sbloccare i due pannelli.
-- L'accesso viene salvato sul database: da quel momento i pannelli restano
-- apribili per quell'admin senza reinserire la password. La password viene
-- verificata SUL SERVER (non e' nel codice del sito).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_panel_unlocks (
  user_id     uuid PRIMARY KEY,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_panel_unlocks ENABLE ROW LEVEL SECURITY;
-- Nessuna policy diretta: si accede solo tramite le funzioni SECURITY DEFINER.

-- Verifica se l'admin corrente ha gia' sbloccato i pannelli.
CREATE OR REPLACE FUNCTION public.has_admin_panel_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_panel_unlocks WHERE user_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.has_admin_panel_access() TO authenticated;

-- Sblocca i pannelli per l'admin corrente se la password e' corretta.
-- Ritorna true se sbloccato, false se password errata.
CREATE OR REPLACE FUNCTION public.unlock_admin_panels(p_password text)
RETURNS boolean
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

  IF p_password <> '39i4mdwe' THEN
    RETURN false;
  END IF;

  INSERT INTO admin_panel_unlocks (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_admin_panels(text) TO authenticated;
