-- =============================================================================
-- Cronologia Azioni admin: pulizia a 24 ore.
--
-- IMPORTANTE: get_user_actions RESTITUISCE una tabella, quindi viene eseguita
-- in sola lettura: NON puo' contenere una DELETE (un primo tentativo con la
-- DELETE al suo interno faceva fallire la RPC -> "Cronologia non disponibile").
-- La cancellazione fisica e' quindi affidata a:
--   1) un job pg_cron ORARIO, che elimina tutto cio' che supera le 24h anche
--       se nessun admin compie azioni e nessuno apre il pannello;
--   2) log_user_action, che pulisce ad ogni nuova azione (funzione void, la
--       DELETE al suo interno e' consentita).
-- get_user_actions filtra comunque alle ultime 24h in lettura, quindi le voci
-- vecchie non compaiono mai anche nel breve intervallo prima del job.
-- send_inbox_to_all NON viene toccata (mantiene la firma con premi).
-- =============================================================================

-- READ (sola lettura): ritorna solo le ultime 24h. Nessuna DELETE qui dentro.
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

-- Job orario che elimina le voci oltre le 24h, indipendente da azioni/aperture.
DO $$
BEGIN
  PERFORM cron.unschedule('purge-admin-user-actions-24h');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
SELECT cron.schedule(
  'purge-admin-user-actions-24h',
  '0 * * * *',
  $$DELETE FROM public.admin_user_actions WHERE created_at < now() - interval '24 hours'$$
);

-- Purga immediata delle voci vecchie gia' presenti (es. quelle di giugno).
DELETE FROM public.admin_user_actions WHERE created_at < now() - interval '24 hours';
