-- 🔄 Reset stats utenti reali su richiesta utente: "voglio vedere come
-- evolve la situazione da ora".
--
-- Azzera tutti i contatori partite e i trofei per tutti gli utenti reali.
-- Per gli admin profile basta aggiornare EPOCH in src/lib/adminElo.ts (già
-- spostata al 25 maggio 2026 09:42 UTC) → V/S/T ricalcolati live dall'EPOCH.
--
-- Reset di:
--   tris_games.tris_wins, tris_losses, tris_draws
--   tris_games.dama_wins, dama_losses, dama_draws
--   tris_games.top_1_trophies
--   tris_games.last_game_at, last_game_payment_type
--   tris_games.games_played_today (counter giornaliero)
--   tris_games.last_known_rank (per il vecchio sistema transizione)
--   daily_top1_trophies (storia premi giornalieri svuotata)
--   profiles.game_elo riportato al default 1200 per utenti reali

-- 1) Azzera tutte le stats partite in tris_games
UPDATE public.tris_games
SET tris_wins = 0,
    tris_losses = 0,
    tris_draws = 0,
    dama_wins = 0,
    dama_losses = 0,
    dama_draws = 0,
    top_1_trophies = 0,
    last_game_at = NULL,
    last_game_payment_type = NULL,
    games_played_today = 0,
    last_known_rank = NULL,
    last_reset_date = CURRENT_DATE;

-- 2) Svuota la storia dei trofei "Campione del giorno" — ricomincia da zero
DELETE FROM public.daily_top1_trophies;

-- 3) Reset ELO utenti reali al default 1200 (admin hanno game_elo simulato lato
-- client da computeAdminElos, ininfluente per loro)
UPDATE public.profiles
SET game_elo = 1200
WHERE is_admin_profile = false;
