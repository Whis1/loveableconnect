-- 🔧 Fix: 'column reference "user_id" is ambiguous' in admin_list_tiered.
--
-- La RPC ha 'user_id' sia come colonna OUT (RETURNS TABLE) sia come colonna
-- delle tabelle public.user_roles e auth.users → PL/pgSQL non sa quale
-- referenziare. Aggiungo la direttiva #variable_conflict use_column
-- per dare priorità alle colonne delle tabelle, risolvendo l'ambiguità.

CREATE OR REPLACE FUNCTION public.admin_list_tiered()
RETURNS TABLE(user_id UUID, email TEXT, admin_tier INTEGER, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND role = 'admin' AND admin_tier = 1
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id,
    au.email::TEXT,
    ur.admin_tier,
    ur.created_at
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  WHERE ur.role = 'admin'
  ORDER BY ur.admin_tier ASC, ur.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_tiered() TO authenticated;

-- Stessa precauzione per admin_promote_to_tier (potrebbe avere lo stesso
-- problema con user_id come OUT param + colonna interna).
CREATE OR REPLACE FUNCTION public.admin_promote_to_tier(
  p_email TEXT,
  p_tier INTEGER
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

  INSERT INTO public.user_roles (user_id, role, admin_tier)
  VALUES (v_user_id, 'admin', p_tier)
  ON CONFLICT (user_id, role)
  DO UPDATE SET admin_tier = p_tier;

  RETURN QUERY SELECT true, v_user_id, ('Utente ' || p_email || ' promosso ad admin tier ' || p_tier::TEXT)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_promote_to_tier(TEXT, INTEGER) TO authenticated;

-- Idem per admin_demote (non ha user_id OUT ma il SELECT EXISTS internamente
-- usa user_id ambiguamente).
CREATE OR REPLACE FUNCTION public.admin_demote(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND role = 'admin' AND admin_tier = 1
  ) THEN
    RETURN QUERY SELECT false, 'Solo admin di tier 1 possono revocare'::TEXT;
    RETURN;
  END IF;

  IF p_user_id = auth.uid() THEN
    RETURN QUERY SELECT false, 'Non puoi revocare il tuo stesso account admin'::TEXT;
    RETURN;
  END IF;

  DELETE FROM public.user_roles
  WHERE user_roles.user_id = p_user_id AND role = 'admin';

  RETURN QUERY SELECT true, 'Admin revocato con successo'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_demote(UUID) TO authenticated;
