-- 🔧 Aggiorna admin_promote_to_tier per supportare la cancellazione
-- del profilo auto-generato dal trigger handle_new_user.
--
-- USE CASE: quando l'admin di tier 1 crea un nuovo admin direttamente dal
-- client (signUp), il trigger handle_new_user crea automaticamente una riga
-- in public.profiles. Per evitare che l'admin nuovo appaia in bacheca,
-- la chiamata RPC passa p_delete_profile=true e la RPC cancella il profile.

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
  -- Verifica chiamante = admin tier 1
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

  -- Upsert role + tier
  INSERT INTO public.user_roles (user_id, role, admin_tier)
  VALUES (v_user_id, 'admin', p_tier)
  ON CONFLICT (user_id, role)
  DO UPDATE SET admin_tier = p_tier;

  -- 🆕 Se richiesto, cancella il profile (l'admin NON apparirà in bacheca,
  -- esplorazione, ricerca, ecc). Usato quando si crea un admin da zero
  -- via signUp + promote.
  IF p_delete_profile THEN
    DELETE FROM public.profiles WHERE id = v_user_id;
  END IF;

  RETURN QUERY SELECT true, v_user_id, ('Utente ' || p_email || ' promosso ad admin tier ' || p_tier::TEXT)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_promote_to_tier(TEXT, INTEGER, BOOLEAN) TO authenticated;

-- Mantieni la vecchia signature a 2 parametri come wrapper (per non rompere
-- il vecchio codice client che chiama senza p_delete_profile).
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
