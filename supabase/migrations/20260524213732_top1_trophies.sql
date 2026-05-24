-- 🏆 Trofei TOP 1 per utenti reali + reset stats partite.
--
-- Aggiunge:
--   - top_1_trophies INTEGER → quante volte l'utente ha raggiunto la #1 posizione
--   - last_known_rank INTEGER → ultima posizione conosciuta, per evitare di
--     dare un trofeo ad ogni partita giocata in cima (solo alla TRANSIZIONE
--     da non-#1 a #1).
--
-- AZZERA TUTTE le statistiche partite esistenti (richiesta utente: "tutto
-- ricomincia da ora"). Anche game_elo viene riportato al default 1200.
--
-- Aggiunge RPC award_top1_trophy_if_promoted(user_id, current_rank):
-- chiamata dal client dopo ogni partita, incrementa top_1_trophies SOLO se
-- l'utente e' ora #1 ma prima non lo era. SECURITY DEFINER per bypassare RLS.

-- 1) Nuove colonne
ALTER TABLE public.tris_games
  ADD COLUMN IF NOT EXISTS top_1_trophies INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_known_rank INTEGER;

-- 2) Reset stats partite per TUTTI gli utenti (su richiesta utente)
UPDATE public.tris_games
SET tris_wins = 0,
    tris_losses = 0,
    tris_draws = 0,
    dama_wins = 0,
    dama_losses = 0,
    dama_draws = 0,
    top_1_trophies = 0,
    last_known_rank = NULL,
    last_game_at = NULL,
    last_game_payment_type = NULL;

-- 3) Reset ELO utenti reali al default 1200 (admin non hanno game_elo usato:
-- per loro il valore in DB e' irrilevante perche' viene sovrascritto da
-- computeAdminElos lato client)
UPDATE public.profiles
SET game_elo = 1200
WHERE is_admin_profile = false;

-- 4) RPC: assegna trofeo TOP 1 solo se l'utente passa DA non-#1 A #1.
-- Idempotente per richieste duplicate (controlla last_known_rank).
CREATE OR REPLACE FUNCTION public.award_top1_trophy_if_promoted(
  p_user_id UUID,
  p_current_rank INTEGER
)
RETURNS TABLE(awarded BOOLEAN, total_trophies INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_rank INTEGER;
  v_new_trophies INTEGER;
  v_awarded BOOLEAN := FALSE;
BEGIN
  -- Crea la riga se non esiste
  INSERT INTO public.tris_games (user_id, games_played_today, last_reset_date)
  VALUES (p_user_id, 0, CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  -- Leggi la posizione precedente
  SELECT last_known_rank INTO v_prev_rank
  FROM public.tris_games
  WHERE user_id = p_user_id
  LIMIT 1;

  -- Promozione a #1: assegna il trofeo
  IF p_current_rank = 1 AND (v_prev_rank IS NULL OR v_prev_rank > 1) THEN
    UPDATE public.tris_games
    SET top_1_trophies = top_1_trophies + 1,
        last_known_rank = p_current_rank
    WHERE user_id = p_user_id;
    v_awarded := TRUE;
  ELSE
    -- Nessun trofeo, ma aggiorna la posizione conosciuta
    UPDATE public.tris_games
    SET last_known_rank = p_current_rank
    WHERE user_id = p_user_id;
  END IF;

  -- Restituisci il nuovo totale trofei
  SELECT top_1_trophies INTO v_new_trophies
  FROM public.tris_games
  WHERE user_id = p_user_id
  LIMIT 1;

  RETURN QUERY SELECT v_awarded, COALESCE(v_new_trophies, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_top1_trophy_if_promoted(UUID, INTEGER) TO authenticated;
