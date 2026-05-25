-- 🔧 Fix 'Could not choose the best candidate function between' su admin_promote_to_tier.
--
-- PostgREST non sa quale overload chiamare:
--   admin_promote_to_tier(p_email TEXT, p_tier INTEGER)
--   admin_promote_to_tier(p_email TEXT, p_tier INTEGER, p_delete_profile BOOLEAN)
--
-- Quando il client passa solo {p_email, p_tier}, PostgREST trova due funzioni
-- candidate e fallisce. Soluzione: DROP la versione a 2 parametri, lasciando
-- SOLO quella a 3 parametri (p_delete_profile ha DEFAULT false, quindi
-- chiamabile come prima con 2 parametri).

DROP FUNCTION IF EXISTS public.admin_promote_to_tier(TEXT, INTEGER);

-- Manteniamo solo la versione a 3 parametri (con DEFAULT)
-- Il CREATE OR REPLACE sotto è solo per essere idempotenti, la funzione
-- esiste già dalla migration precedente con DEFAULT false.
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

  -- Conferma email se non lo è
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = v_user_id;

  INSERT INTO public.user_roles (user_id, role, admin_tier)
  VALUES (v_user_id, 'admin', p_tier)
  ON CONFLICT (user_id, role)
  DO UPDATE SET admin_tier = p_tier;

  IF p_delete_profile THEN
    DELETE FROM public.profiles WHERE id = v_user_id;
  END IF;

  RETURN QUERY SELECT true, v_user_id, ('Utente ' || p_email || ' promosso ad admin tier ' || p_tier::TEXT)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_promote_to_tier(TEXT, INTEGER, BOOLEAN) TO authenticated;
