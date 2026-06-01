-- ⚡ INDICI DI PERFORMANCE — preventivi per la crescita (1k → 10k+ utenti).
--
-- Con pochi profili (oggi ~300) il DB è veloce anche senza indici, perché
-- Postgres fa una scansione completa in pochi ms. Ma quando i profili saranno
-- migliaia, le query che ORDINANO o FILTRANO senza indice rallentano in modo
-- evidente. Questi indici le tengono veloci a prescindere dalla dimensione.
--
-- Sono tutti IF NOT EXISTS: rieseguibili senza errori. CONCURRENTLY evita di
-- bloccare le tabelle durante la creazione (sicuro anche con utenti online).
--
-- ⚠️ Esegui questo script UNA RIGA/BLOCCO ALLA VOLTA se l'editor SQL dà errore
--    "CREATE INDEX CONCURRENTLY cannot run inside a transaction block":
--    in quel caso togli la parola CONCURRENTLY (con pochi dati è istantaneo).

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: la tabella più interrogata (bacheca, classifica, ricerche)
-- ─────────────────────────────────────────────────────────────────────────

-- Classifica ELO e ordinamenti per punteggio (ORDER BY game_elo DESC)
CREATE INDEX IF NOT EXISTS idx_profiles_game_elo
  ON public.profiles (game_elo DESC);

-- Bacheca: ordinamento per ultima attività (ORDER BY last_active DESC)
CREATE INDEX IF NOT EXISTS idx_profiles_last_active
  ON public.profiles (last_active DESC NULLS LAST);

-- Distinzione admin / utenti reali (usata praticamente ovunque)
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin
  ON public.profiles (is_admin_profile);

-- Filtri della bacheca: genere e orientamento. Indice composito = copre la
-- ricerca filtrata (gender + sexual_orientation) in un colpo solo.
CREATE INDEX IF NOT EXISTS idx_profiles_gender_orientation
  ON public.profiles (gender, sexual_orientation);

-- Filtro età (slider 18–60)
CREATE INDEX IF NOT EXISTS idx_profiles_age
  ON public.profiles (age);

-- ─────────────────────────────────────────────────────────────────────────
-- matches: esclusione dei profili già matchati dalla bacheca + lista match
-- (query del tipo: user1_id = me OR user2_id = me)
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON public.matches (user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON public.matches (user2_id);

-- ─────────────────────────────────────────────────────────────────────────
-- messages: caricamento conversazione (per match) ordinata per data,
-- e conteggio non letti
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_match_created
  ON public.messages (match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read
  ON public.messages (receiver_id, read);

-- ─────────────────────────────────────────────────────────────────────────
-- likes: "chi mi ha messo like" (to_user_id) + verifica like inviato (from_user_id)
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_likes_to_user   ON public.likes (to_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_from_user ON public.likes (from_user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- user_credits: lookup per utente (saldo/abbonamento), letto a ogni pagina
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_credits_user
  ON public.user_credits (user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- purchases: cronologia acquisti per utente + lookup per sessione Stripe
-- (usato dal webhook e da verify-payment per l'idempotenza)
-- ─────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_purchases_user
  ON public.purchases (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session
  ON public.purchases (stripe_session_id);
