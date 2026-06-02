-- =============================================================================
-- Chattors: lista conversazioni veloce + marcatura "letto" affidabile
-- =============================================================================
-- La edge function admin-secondary-get-conversations faceva un pattern N+1
-- (per ogni profilo admin, per ogni match, query separate) e impiegava ~18s.
-- La sostituiamo con una funzione SQL set-based che fa tutto in una sola query
-- (millisecondi), chiamabile direttamente dal client via supabase.rpc().
--
-- Entrambe le funzioni sono SECURITY DEFINER cosi' possono leggere/scrivere
-- bypassando RLS (la pagina chattors usa la chiave anon, come gia' faceva la
-- edge function con verify_jwt=false: stesso livello di accesso di prima).
-- =============================================================================

-- Indici utili per rendere le query rapide.
CREATE INDEX IF NOT EXISTS idx_messages_match_created
  ON public.messages (match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_match_sender_read
  ON public.messages (match_id, sender_id, read);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON public.matches (user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON public.matches (user2_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin
  ON public.profiles (is_admin_profile) WHERE is_admin_profile = true;

-- -----------------------------------------------------------------------------
-- get_chattors_conversations: lista delle conversazioni admin-profilo <-> utente
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_chattors_conversations()
RETURNS TABLE (
  "userId"        uuid,
  "userNickname"  text,
  "userAvatar"    text,
  "adminProfileId" uuid,
  "adminNickname" text,
  "matchId"       uuid,
  "lastMessageAt" timestamptz,
  "unreadCount"   bigint,
  "userCity"      text,
  "userLatitude"  double precision,
  "userLongitude" double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH admin_ids AS (
    SELECT id FROM profiles WHERE is_admin_profile = true
  ),
  -- match dove ESATTAMENTE un lato e' un profilo admin (esclude admin-vs-admin
  -- e match tra due utenti reali). Determina chi e' l'admin e chi l'utente.
  admin_matches AS (
    SELECT
      m.id AS match_id,
      m.created_at AS match_created_at,
      CASE WHEN a1.id IS NOT NULL THEN m.user1_id ELSE m.user2_id END AS admin_id,
      CASE WHEN a1.id IS NOT NULL THEN m.user2_id ELSE m.user1_id END AS user_id
    FROM matches m
    LEFT JOIN admin_ids a1 ON a1.id = m.user1_id
    LEFT JOIN admin_ids a2 ON a2.id = m.user2_id
    WHERE (a1.id IS NOT NULL) <> (a2.id IS NOT NULL)
  ),
  -- statistiche messaggi per match: ultimo messaggio, non letti (utente->admin)
  msg_stats AS (
    SELECT
      am.match_id,
      MAX(msg.created_at) AS last_at,
      COUNT(msg.id) FILTER (
        WHERE msg.sender_id = am.user_id AND msg.read = false
      ) AS unread_cnt
    FROM admin_matches am
    JOIN messages msg ON msg.match_id = am.match_id
    GROUP BY am.match_id
  )
  SELECT
    am.user_id,
    up.nickname,
    up.avatar_url,
    am.admin_id,
    ap.nickname,
    am.match_id,
    ms.last_at,
    COALESCE(ms.unread_cnt, 0),
    up.city,
    up.latitude,
    up.longitude
  FROM admin_matches am
  JOIN msg_stats ms ON ms.match_id = am.match_id          -- solo match con messaggi
  JOIN profiles up ON up.id = am.user_id
  JOIN profiles ap ON ap.id = am.admin_id
  LEFT JOIN admin_archived_conversations ar
    ON ar.admin_profile_id = am.admin_id AND ar.user_id = am.user_id
  -- nascondi le archiviate SENZA non letti (riappaiono quando arrivano nuovi msg)
  WHERE NOT (ar.admin_profile_id IS NOT NULL AND COALESCE(ms.unread_cnt, 0) = 0)
  ORDER BY ms.last_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_chattors_conversations() TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- mark_conversation_read: segna come letti i messaggi dell'utente in un match
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_match_id uuid,
  p_user_id  uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE messages
  SET read = true
  WHERE match_id = p_match_id
    AND sender_id = p_user_id
    AND read = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid, uuid) TO anon, authenticated;
