-- =============================================================================
-- Cronologia Azioni admin sugli utenti (ban / elimina / inbox singolo / inbox ALL)
-- + possibilita' di eliminare i messaggi inbox inviati (singolo o a tutti),
--   rimuovendoli anche dalla inbox degli utenti.
-- =============================================================================

-- Raggruppa i messaggi inbox per "invio" (singolo o broadcast), cosi' possono
-- essere eliminati in blocco e collegati alla voce di cronologia.
ALTER TABLE public.inbox_messages ADD COLUMN IF NOT EXISTS batch_id uuid;
CREATE INDEX IF NOT EXISTS idx_inbox_messages_batch ON public.inbox_messages (batch_id);

CREATE TABLE IF NOT EXISTS public.admin_user_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        uuid,
  admin_email     text,
  action_type     text NOT NULL,            -- 'ban' | 'unban' | 'delete' | 'inbox_single' | 'inbox_all'
  target_user_id  uuid,
  target_nickname text,
  message         text,
  batch_id        uuid,                      -- per gli inbox: collega ai messaggi inviati
  inbox_deleted   boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_user_actions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_user_actions_created ON public.admin_user_actions (created_at DESC);

-- LOG: registra un'azione admin (solo admin). Email presa dal server.
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
  -- Pulizia automatica: via le voci piu' vecchie di 48 ore.
  DELETE FROM admin_user_actions WHERE created_at < now() - interval '48 hours';
  INSERT INTO admin_user_actions (admin_id, admin_email, action_type, target_user_id, target_nickname, message, batch_id)
  VALUES (auth.uid(), v_email, p_action_type, p_target_user_id, p_target_nickname, p_message, p_batch_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_user_action(text, uuid, text, text, uuid) TO authenticated;

-- READ: cronologia azioni (solo admin), ultime 48 ore.
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
    WHERE a.created_at >= now() - interval '48 hours'
    ORDER BY a.created_at DESC
    LIMIT 500;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_user_actions() TO authenticated;

-- INVIO INBOX A TUTTI: inserisce per ogni utente reale, con un batch_id comune,
-- registra l'azione e ritorna batch_id + numero destinatari.
CREATE OR REPLACE FUNCTION public.send_inbox_to_all(p_message text)
RETURNS TABLE (batch_id uuid, count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_batch uuid := gen_random_uuid();
  v_email text;
  v_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  INSERT INTO inbox_messages (user_id, message, batch_id)
  SELECT p.id, p_message, v_batch
  FROM profiles p
  WHERE p.is_admin_profile = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  -- Pulizia automatica: via le voci di cronologia piu' vecchie di 48 ore.
  DELETE FROM admin_user_actions WHERE created_at < now() - interval '48 hours';
  INSERT INTO admin_user_actions (admin_id, admin_email, action_type, message, batch_id)
  VALUES (auth.uid(), v_email, 'inbox_all', p_message, v_batch);

  RETURN QUERY SELECT v_batch, v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_inbox_to_all(text) TO authenticated;

-- ELIMINA un invio inbox (singolo o broadcast): rimuove i messaggi dalle inbox
-- degli utenti e segna la voce di cronologia come eliminata.
CREATE OR REPLACE FUNCTION public.delete_inbox_batch(p_batch_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;
  DELETE FROM inbox_messages WHERE batch_id = p_batch_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE admin_user_actions SET inbox_deleted = true WHERE batch_id = p_batch_id;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_inbox_batch(uuid) TO authenticated;
