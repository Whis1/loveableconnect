-- 👑 Stat "Tornei Vinti" nei profili utente.
--
-- Aggiunge colonna tournaments_won su tris_games e patcha
-- claim_tournament_rewards per incrementarla automaticamente quando
-- l'utente vince la finale (user_final_position = 1).

ALTER TABLE public.tris_games
  ADD COLUMN IF NOT EXISTS tournaments_won INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.claim_tournament_rewards(_tournament_id UUID)
RETURNS TABLE (
  credits_awarded INTEGER,
  elo_delta INTEGER,
  final_position INTEGER,
  game_type TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tournament public.tournaments%ROWTYPE;
  v_user_id UUID := auth.uid();
  v_credits INTEGER := 0;
  v_elo INTEGER := 0;
BEGIN
  SELECT * INTO v_tournament FROM public.tournaments WHERE id = _tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  IF v_tournament.user_id <> v_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_tournament.status = 'active' THEN RAISE EXCEPTION 'Tournament still active'; END IF;
  IF v_tournament.rewards_claimed THEN
    RETURN QUERY SELECT 0, 0, v_tournament.user_final_position, v_tournament.game_type, v_tournament.status;
    RETURN;
  END IF;

  CASE v_tournament.user_final_position
    WHEN 1 THEN v_credits := 12; v_elo := 60;
    WHEN 2 THEN v_credits := 4;  v_elo := -20;
    WHEN 3 THEN v_credits := 2;  v_elo := -20;
    WHEN 4 THEN v_credits := 2;  v_elo := -20;
    ELSE v_credits := 0; v_elo := -20;
  END CASE;

  IF v_credits > 0 THEN
    PERFORM public.deduct_credits(v_user_id, -v_credits);
  END IF;

  IF v_elo <> 0 THEN
    PERFORM public.update_game_elo(v_user_id, v_elo);
  END IF;

  IF v_tournament.user_final_position = 1 THEN
    PERFORM public.increment_game_stat(v_user_id, v_tournament.game_type, 'win');

    -- 👑 NUOVO: incrementa tournaments_won. INSERT ... ON CONFLICT per creare
    --    la riga se non esiste (fallback edge case).
    INSERT INTO public.tris_games (user_id, games_played_today, last_reset_date, tournaments_won)
      VALUES (v_user_id, 0, CURRENT_DATE, 1)
      ON CONFLICT (user_id) DO UPDATE SET
        tournaments_won = public.tris_games.tournaments_won + 1;
  ELSE
    PERFORM public.increment_game_stat(v_user_id, v_tournament.game_type, 'lose');
  END IF;

  UPDATE public.tournaments SET rewards_claimed = TRUE WHERE id = _tournament_id;

  RETURN QUERY SELECT v_credits, v_elo, v_tournament.user_final_position, v_tournament.game_type, v_tournament.status;
END;
$$;
