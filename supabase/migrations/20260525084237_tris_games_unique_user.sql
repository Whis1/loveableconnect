-- 🔧 Fix definitivo bug duplicati su tris_games.
--
-- PROBLEMA: la tabella ha solo INDEX su user_id, niente UNIQUE constraint.
-- Le RPC increment_game_stat / award_top1_trophy_if_promoted / award_daily_top1_if_needed
-- usano `INSERT ... ON CONFLICT DO NOTHING` per creare la riga se non esiste, ma
-- senza UNIQUE constraint il `ON CONFLICT` non scatta mai e l'INSERT procede →
-- duplicati. La pulizia client-side ne cancellava i "vecchi" perdendo le stats.
--
-- FIX:
-- 1) Aggrega tutte le righe duplicate (max delle stats) e tieni solo l'id più vecchio.
-- 2) Aggiunge UNIQUE su user_id → ON CONFLICT DO NOTHING ora funziona davvero.

-- 1) Dedup: per ogni user_id, somma le stats su tutte le righe duplicate e UPDATE
-- la riga più vecchia (id ORDER BY created_at ASC), poi DELETE le altre.
DO $$
DECLARE
  v_user UUID;
  v_keep UUID;
BEGIN
  FOR v_user IN
    SELECT user_id FROM public.tris_games GROUP BY user_id HAVING COUNT(*) > 1
  LOOP
    -- Riga "originale" da mantenere (la più vecchia)
    SELECT id INTO v_keep
      FROM public.tris_games
      WHERE user_id = v_user
      ORDER BY created_at ASC NULLS LAST
      LIMIT 1;

    -- Aggrega i valori massimi di tutte le righe sull'originale
    UPDATE public.tris_games kept
    SET
      games_played_today = sub.max_games_played_today,
      tris_wins   = sub.max_tris_wins,
      tris_losses = sub.max_tris_losses,
      tris_draws  = sub.max_tris_draws,
      dama_wins   = sub.max_dama_wins,
      dama_losses = sub.max_dama_losses,
      dama_draws  = sub.max_dama_draws,
      top_1_trophies = sub.max_top_1_trophies,
      last_game_at = sub.latest_last_game_at,
      last_reset_date = sub.latest_last_reset_date
    FROM (
      SELECT
        MAX(games_played_today) AS max_games_played_today,
        MAX(tris_wins)   AS max_tris_wins,
        MAX(tris_losses) AS max_tris_losses,
        MAX(tris_draws)  AS max_tris_draws,
        MAX(dama_wins)   AS max_dama_wins,
        MAX(dama_losses) AS max_dama_losses,
        MAX(dama_draws)  AS max_dama_draws,
        MAX(top_1_trophies) AS max_top_1_trophies,
        MAX(last_game_at) AS latest_last_game_at,
        MAX(last_reset_date) AS latest_last_reset_date
      FROM public.tris_games
      WHERE user_id = v_user
    ) sub
    WHERE kept.id = v_keep;

    -- Cancella tutte le altre righe (tutte tranne quella da mantenere)
    DELETE FROM public.tris_games
    WHERE user_id = v_user
      AND id <> v_keep;
  END LOOP;
END $$;

-- 2) UNIQUE constraint definitivo → niente più duplicati possibili.
ALTER TABLE public.tris_games
  ADD CONSTRAINT tris_games_user_id_unique UNIQUE (user_id);
