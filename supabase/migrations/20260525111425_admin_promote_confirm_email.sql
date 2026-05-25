-- 🔧 admin_promote_to_tier ora conferma automaticamente l'email del nuovo admin.
--
-- USE CASE: il flusso "crea admin da zero" usa signUp lato client. Se Supabase
-- ha "email confirmations" attivo, il nuovo admin riceverebbe un'email e non
-- potrebbe loggarsi subito. Aggiungiamo qui un UPDATE su auth.users per
-- settare email_confirmed_at = NOW() così l'admin può loggarsi immediatamente.
--
-- SECURITY DEFINER permette di scrivere su auth.users perché la funzione è
-- creata dal ruolo postgres (superuser) di Supabase.

CREATE OR REPLACE FUNCTION public.admin_promote_to_tier(
  p_email TEXT,
  p_tier INTEGER,
  p_delete_profile BOOLEAN DEFAULT false
)
RETURNS TABLE(success BOOLEAN, user_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND role = 'admin' AND admin_tier = 1
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Solo admin di tier 1 possono promuovere'::TEXT;
    RETURN;
  END IF;

  IF p_tier NOT IN (1, 2) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Tier deve essere 1 o 2'::TEXT;
    RETURN;
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Nessun utente trovato con questa email'::TEXT;
    RETURN;
  END IF;

  -- 🆕 Conferma email automaticamente (così il nuovo admin può loggarsi
  -- immediatamente senza dover cliccare il link nell'email).
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      confirmed_at = COALESCE(confirmed_at, NOW())
  WHERE id = v_user_id;

  -- Upsert role + tier
  INSERT INTO public.user_roles (user_id, role, admin_tier)
  VALUES (v_user_id, 'admin', p_tier)
  ON CONFLICT (user_id, role)
  DO UPDATE SET admin_tier = p_tier;

  -- Cancella profile per nascondere l'admin dalla bacheca
  IF p_delete_profile THEN
    DELETE FROM public.profiles WHERE id = v_user_id;
  END IF;

  RETURN QUERY SELECT true, v_user_id, ('Utente ' || p_email || ' promosso ad admin tier ' || p_tier::TEXT)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_promote_to_tier(TEXT, INTEGER, BOOLEAN) TO authenticated;

-- Wrapper 2-param (retrocompat)
CREATE OR REPLACE FUNCTION public.admin_promote_to_tier(
  p_email TEXT,
  p_tier INTEGER
)
RETURNS TABLE(success BOOLEAN, user_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.admin_promote_to_tier(p_email, p_tier, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_promote_to_tier(TEXT, INTEGER) TO authenticated;
