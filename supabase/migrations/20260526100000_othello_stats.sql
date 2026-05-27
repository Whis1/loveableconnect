-- 📊 Stats Othello: aggiungere colonne othello_wins/losses/draws su tris_games
-- e aggiornare la RPC increment_game_stat per supportare il nuovo gioco.
--
-- 🐛 BUG STORICO: prima di questa migration, la RPC accettava solo
-- p_game IN ('tris', 'dama'). Quando OthelloBoard chiamava la RPC con
-- p_game='othello', NESSUN branch matchava, la RPC ritornava VOID senza
-- errore, e le statistiche di vittoria/sconfitta non venivano salvate.
-- L'utente vedeva +ELO ma le vittorie non aumentavano. Fix: aggiungere
-- i 6 branch othello (win/lose/draw).

ALTER TABLE public.tris_games
  ADD COLUMN IF NOT EXISTS othello_wins   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS othello_losses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS othello_draws  INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_game_stat(
  p_user_id UUID,
  p_game TEXT,         -- 'tris' | 'dama' | 'othello'
  p_result TEXT        -- 'win' | 'lose' | 'draw'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  ELSIF p_game = 'othello' AND p_result = 'win' THEN
    UPDATE public.tris_games SET othello_wins = othello_wins + 1, last_game_at = NOW() WHERE user_id = p_user_id;
  ELSIF p_game = 'othello' AND p_result = 'lose' THEN
    UPDATE public.tris_games SET othello_losses = othello_losses + 1, last_game_at = NOW() WHERE user_id = p_user_id;
  ELSIF p_game = 'othello' AND p_result = 'draw' THEN
    UPDATE public.tris_games SET othello_draws = othello_draws + 1, last_game_at = NOW() WHERE user_id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_game_stat(UUID, TEXT, TEXT) TO authenticated;
