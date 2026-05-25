-- 🔧 RPC mark_support_messages_read: marca come letti tutti i messaggi non-admin
-- di un utente. SECURITY DEFINER per bypassare RLS che probabilmente bloccava
-- l'UPDATE silenziosamente (causa: il badge 'N non letti' restava anche dopo
-- aver visualizzato la chat).
--
-- Verifica che il chiamante sia admin (qualsiasi tier) prima di procedere.

CREATE OR REPLACE FUNCTION public.mark_support_messages_read(p_user_id UUID)
RETURNS TABLE(updated_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Solo admin può marcare i messaggi come letti
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN QUERY SELECT 0;
    RETURN;
  END IF;

  UPDATE public.support_messages
  SET read = true
  WHERE user_id = p_user_id
    AND is_admin_response = false
    AND read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_support_messages_read(UUID) TO authenticated;
