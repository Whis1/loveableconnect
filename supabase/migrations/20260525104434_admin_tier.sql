-- 🛡️ Tier amministrativi su user_roles.
--
-- Aggiunge il campo admin_tier (1=full access, 2=ridotto) per gli account
-- con role='admin'. Implementa 3 RPC SECURITY DEFINER per:
--   - admin_promote_to_tier(email, tier) → promuove utente esistente
--   - admin_list_tiered() → lista admin con tier (solo per tier 1)
--   - admin_demote(user_id) → revoca admin (solo per tier 1)
--
-- TIER 1 (full): vede TUTTI i pulsanti in /adminarrettu (Profili & Chat,
--   Creazione Profili, Supporto Clienti, Inbox ALL, gestione utenti, ecc.)
-- TIER 2 (ridotto): vede /adminarrettu MA senza "Profili & Chat" e "Creazione
--   Profili" — utile per admin che gestiscono supporto e moderazione ma non
--   creazione profili admin / gestione chat.

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS admin_tier INTEGER
  CHECK (admin_tier IS NULL OR admin_tier IN (1, 2));

-- Tutti gli admin esistenti diventano tier 1 (full access) di default
UPDATE public.user_roles
SET admin_tier = 1
WHERE role = 'admin' AND admin_tier IS NULL;

-- 🎯 RPC: promuove un utente esistente (cercato per email) a admin con tier.
-- Solo admin di tier 1 possono usarla.
CREATE OR REPLACE FUNCTION public.admin_promote_to_tier(
  p_email TEXT,
  p_tier INTEGER
)
RETURNS TABLE(success BOOLEAN, user_id UUID, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Solo admin tier 1 può promuovere
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND admin_tier = 1
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Solo admin di tier 1 possono promuovere'::TEXT;
    RETURN;
  END IF;

  IF p_tier NOT IN (1, 2) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Tier deve essere 1 o 2'::TEXT;
    RETURN;
  END IF;

  -- Cerca user_id da auth.users
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

  RETURN QUERY SELECT true, v_user_id, ('Utente ' || p_email || ' promosso ad admin tier ' || p_tier::TEXT)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_promote_to_tier(TEXT, INTEGER) TO authenticated;

-- 🎯 RPC: lista admin con tier (solo per admin tier 1)
CREATE OR REPLACE FUNCTION public.admin_list_tiered()
RETURNS TABLE(user_id UUID, email TEXT, admin_tier INTEGER, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND admin_tier = 1
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

-- 🎯 RPC: revoca admin. Solo tier 1, non può revocare se stesso.
CREATE OR REPLACE FUNCTION public.admin_demote(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND admin_tier = 1
  ) THEN
    RETURN QUERY SELECT false, 'Solo admin di tier 1 possono revocare'::TEXT;
    RETURN;
  END IF;

  IF p_user_id = auth.uid() THEN
    RETURN QUERY SELECT false, 'Non puoi revocare il tuo stesso account admin'::TEXT;
    RETURN;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'admin';
  RETURN QUERY SELECT true, 'Admin revocato con successo'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_demote(UUID) TO authenticated;
