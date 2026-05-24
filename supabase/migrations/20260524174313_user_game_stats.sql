-- 📊 Statistiche partite utente per il pannello admin "Partite":
-- vittorie/sconfitte/pareggi per gioco (tris, dama), timestamp dell'ultima
-- partita e tipo di pagamento usato (free/credits/premium).
--
-- Aggiunto su tris_games perche' la tabella esiste gia' e ha 1 riga per utente.
-- (Nonostante il nome storico "tris_games", la tabella ospita ora gli stat
-- aggregati di TUTTI i giochi: tris e dama.)

ALTER TABLE public.tris_games
  ADD COLUMN IF NOT EXISTS tris_wins   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tris_losses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tris_draws  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dama_wins   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dama_losses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dama_draws  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_game_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_game_payment_type TEXT
    CHECK (last_game_payment_type IS NULL OR last_game_payment_type IN ('free', 'credits', 'premium'));

-- 🔐 Policy: l'admin puo' leggere TUTTE le righe tris_games (serve per il
-- pannello dettagli utente). Le policy esistenti (USER_OWN per SELECT, INSERT
-- e UPDATE) restano valide per gli utenti normali.
DROP POLICY IF EXISTS "Admin can view all tris games" ON public.tris_games;
CREATE POLICY "Admin can view all tris games"
  ON public.tris_games
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 🎯 RPC: incremento atomico delle stats di un utente al termine di una partita.
-- Usata da TrisGameBanner.handleGameEnd. SECURITY DEFINER per evitare problemi
-- di RLS (l'utente sta aggiornando solo i propri stats, ma con UPDATE atomico).
CREATE OR REPLACE FUNCTION public.increment_game_stat(
  p_user_id UUID,
  p_game TEXT,         -- 'tris' | 'dama'
  p_result TEXT        -- 'win' | 'lose' | 'draw'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Crea la riga se non esiste (utente che gioca senza essere mai passato da
  -- checkGamesRemaining e' un edge case)
  INSERT INTO public.tris_games (user_id, games_played_today, last_reset_date)
  VALUES (p_user_id, 0, CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  IF p_game = 'tris' AND p_result = 'win' THEN
    UPDATE public.tris_games SET tris_wins = tris_wins + 1, last_game_at = NOW() WHERE user_id = p_user_id;
  ELSIF p_game = 'tris' AND p_result = 'lose' THEN
    UPDATE public.tris_games SET tris_losses = tris_losses + 1, last_game_at = NOW() WHERE user_id = p_user_id;
  ELSIF p_game = 'tris' AND p_result = 'draw' THEN
    UPDATE public.tris_games SET tris_draws = tris_draws + 1, last_game_at = NOW() WHERE user_id = p_user_id;
  ELSIF p_game = 'dama' AND p_result = 'win' THEN
    UPDATE public.tris_games SET dama_wins = dama_wins + 1, last_game_at = NOW() WHERE user_id = p_user_id;
  ELSIF p_game = 'dama' AND p_result = 'lose' THEN
    UPDATE public.tris_games SET dama_losses = dama_losses + 1, last_game_at = NOW() WHERE user_id = p_user_id;
  ELSIF p_game = 'dama' AND p_result = 'draw' THEN
    UPDATE public.tris_games SET dama_draws = dama_draws + 1, last_game_at = NOW() WHERE user_id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_game_stat(UUID, TEXT, TEXT) TO authenticated;
