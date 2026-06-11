-- ============================================================
-- ARCHIVIO CHAT ASSISTENZA NEL DATA VAULT, A LIVELLO DATABASE
-- Sostituisce l'inoltro che stava nell'edge function
-- admin-delete-support-conversation: quando i messaggi di supporto
-- di un utente vengono cancellati (chiusura assistenza), il trigger
-- raccoglie TUTTE le righe eliminate e le spedisce al Vault come
-- un'unica conversazione (categoria chat_assistenza), collegata alla
-- richiesta di valutazione creata pochi istanti prima.
-- Cosi' l'archiviazione funziona qualunque sia il codice deployato.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_forward_support_chat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid;
  v_rating record;
  v_payload jsonb;
BEGIN
  FOR v_user IN SELECT DISTINCT user_id FROM deleted_msgs WHERE user_id IS NOT NULL LOOP
    -- Richiesta di valutazione creata dall'edge function subito prima
    -- della cancellazione: fornisce il collegamento chat-valutazione
    -- e l'elenco degli admin che hanno assistito.
    SELECT id, admins INTO v_rating
      FROM public.support_ratings
     WHERE user_id = v_user
       AND created_at > now() - interval '10 minutes'
     ORDER BY created_at DESC
     LIMIT 1;

    SELECT jsonb_build_object(
      'rating_request_id', v_rating.id,
      'user_id',     v_user,
      'user_email',  MAX(d.user_email),
      'admins',      COALESCE(v_rating.admins, '[]'::jsonb),
      'assisted_at', MAX(d.created_at),
      'messages',    jsonb_agg(to_jsonb(d) ORDER BY d.created_at)
    ) INTO v_payload
    FROM deleted_msgs d
    WHERE d.user_id = v_user;

    PERFORM public.forward_to_vault('chat_assistenza', v_payload);
  END LOOP;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS forward_support_chat ON public.support_messages;
CREATE TRIGGER forward_support_chat
AFTER DELETE ON public.support_messages
REFERENCING OLD TABLE AS deleted_msgs
FOR EACH STATEMENT
EXECUTE FUNCTION public.trg_forward_support_chat();
