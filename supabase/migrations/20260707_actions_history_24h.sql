-- =============================================================================
-- Cronologia Azioni admin: pulizia a 24 ore (prima erano 48h e, soprattutto,
-- la funzione realmente attiva in produzione non filtrava per tempo, quindi
-- restavano visibili voci di settimane prima).
--
-- Qui si fa in modo che:
--   1) get_user_actions elimini FISICAMENTE le voci piu' vecchie di 24h ad
--       OGNI apertura della cronologia (non solo quando si compie un'azione),
--      e ritorni solo le ultime 24h.
--   2) log_user_action pulisca a 24h invece che 48h.
-- send_inbox_to_all NON viene toccata (ha la firma con premi p_credits/p_likes):
-- la sua eventuale pulizia interna diventa ininfluente perche' ci pensa
-- get_user_actions ad ogni lettura.
-- =============================================================================

-- READ + PULIZIA: elimina >24h e ritorna le ultime 24h (solo admin).
CREATE OR REPLACE FUNCTION public.get_user_actions()
RETURNS TABLE (
  id uuid, admin_email text, action_type text, target_nickname text,
  message text, batch_id uuid, inbox_deleted boolean, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  -- Pulizia ad ogni apertura: via tutto cio' che ha piu' di 24 ore.
  DELETE FROM admin_user_actions WHERE created_at < now() - interval '24 hours';

  RETURN QUERY
    SELECT a.id, a.admin_email, a.action_type, a.target_nickname, a.message,
           a.batch_id, a.inbox_deleted, a.created_at
    FROM admin_user_actions a
    WHERE a.created_at >= now() - interval '24 hours'
    ORDER BY a.created_at DESC
    LIMIT 500;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_actions() TO authenticated;

-- LOG: registra un'azione admin, pulendo prima le voci piu' vecchie di 24h.
CREATE OR REPLACE FUNCTION public.log_user_action(
  p_action_type     text,
  p_target_user_id  uuid,
  p_target_nickname text,
  p_message         text,
  p_batch_id        uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_email text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  DELETE FROM admin_user_actions WHERE created_at < now() - interval '24 hours';
  INSERT INTO admin_user_actions (admin_id, admin_email, action_type, target_user_id, target_nickname, message, batch_id)
  VALUES (auth.uid(), v_email, p_action_type, p_target_user_id, p_target_nickname, p_message, p_batch_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_user_action(text, uuid, text, text, uuid) TO authenticated;

-- Purga immediata delle voci vecchie gia' presenti (es. quelle di giugno).
DELETE FROM public.admin_user_actions WHERE created_at < now() - interval '24 hours';
