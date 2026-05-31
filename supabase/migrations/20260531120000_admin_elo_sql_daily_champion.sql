-- 🏆 CAMPIONE DEL GIORNO LATO SERVER (admin + utenti reali insieme), SEMPRE ATTIVO.
--
-- PROBLEMA risolto: gli ELO admin erano simulati SOLO nel client (adminElo.ts),
-- quindi il DB/cron non li conosceva e incoronava il miglior utente reale →
-- titoli Champion/Weekly/Monthly non meritati (es. 14° ma Weekly Champion).
--
-- SOLUZIONE: replichiamo la simulazione ELO admin in SQL (identica bit-per-bit
-- alla versione TypeScript, verificata in Node). Così un cron pg può ricalcolare
-- la classifica COMPLETA ogni notte e assegnare il campione corretto, anche se
-- nessun utente naviga il sito per anni.
--
-- ⚠️ Se mai cambi la formula in src/lib/adminElo.ts, aggiorna ANCHE qui.

-- ───────────────────────────────────────────────────────────────────────────
-- 1) HASH FNV-1a 32-bit (identico a hash() in adminElo.ts)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fnv1a(s TEXT)
RETURNS BIGINT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  h BIGINT := 2166136261;
  i INT;
  c INT;
  M BIGINT := 4294967296; -- 2^32
BEGIN
  FOR i IN 1..length(s) LOOP
    c := ascii(substr(s, i, 1));
    h := (h # c);                     -- XOR
    h := (h * 16777619) % M;          -- *FNV_prime mod 2^32
  END LOOP;
  RETURN h;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2) baseElo(id) — identico a adminElo.ts
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_base_elo(id TEXT)
RETURNS INT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  h BIGINT := public.fnv1a(id);
  t INT := (h % 100)::INT;
  inner_v BIGINT := (h >> 8);
BEGIN
  IF t < 5  THEN RETURN 2500 + ((inner_v % 51) * 10)::INT; END IF;
  IF t < 18 THEN RETURN 2000 + ((inner_v % 51) * 10)::INT; END IF;
  IF t < 45 THEN RETURN 1500 + ((inner_v % 51) * 10)::INT; END IF;
  IF t < 72 THEN RETURN 1000 + ((inner_v % 51) * 10)::INT; END IF;
  IF t < 87 THEN RETURN  600 + ((inner_v % 41) * 10)::INT; END IF;
  IF t < 95 THEN RETURN  300 + ((inner_v % 31) * 10)::INT; END IF;
  RETURN 100 + ((inner_v % 21) * 10)::INT;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3) bucket personale(id, now_ms) — identico a personalBucket
--    EPOCH = Date.UTC(2026,4,25,9,42) = 2026-05-25 09:42 UTC
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_bucket(id TEXT, now_ms BIGINT)
RETURNS INT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  epoch_ms   BIGINT := 1779702120000;        -- 2026-05-25T09:42:00Z in ms (Date.UTC(2026,4,25,9,42))
  hour_ms    BIGINT := 3600000;
  slot_ms    BIGINT := 300000;               -- 5 min
  freq_h     INT;
  freq_ms    BIGINT;
  slots      BIGINT;
  off_ms     BIGINT;
BEGIN
  freq_h  := 2 + (public.fnv1a(id || '#freq') % 7)::INT;
  freq_ms := freq_h::BIGINT * hour_ms;
  slots   := GREATEST(1, freq_ms / slot_ms);
  off_ms  := (public.fnv1a(id || '#offset') % slots) * slot_ms;
  RETURN FLOOR((now_ms - epoch_ms - off_ms)::NUMERIC / freq_ms)::INT;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4) sessionGameCount(id, bucket) — identico a sessionGameCount
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_games(id TEXT, b INT)
RETURNS INT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  h BIGINT := public.fnv1a(id || '#count#' || b::TEXT);
  r INT := (h % 100)::INT;
  inner_v BIGINT := (h >> 8);
BEGIN
  IF r < 30 THEN RETURN 0; END IF;
  IF r < 60 THEN RETURN 1; END IF;
  IF r < 78 THEN RETURN 2 + (inner_v % 2)::INT; END IF;
  IF r < 90 THEN RETURN 4 + (inner_v % 3)::INT; END IF;
  IF r < 97 THEN RETURN 7 + (inner_v % 3)::INT; END IF;
  RETURN 10 + (inner_v % 5)::INT;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5) singleSessionDrift(id, bucket) — identico (coin-flip su bit dell'hash)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_drift1(id TEXT, b INT)
RETURNS INT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  g INT := public.admin_games(id, b);
  oh BIGINT;
  i INT;
  bit INT;
  w INT := 0;
  l INT := 0;
BEGIN
  IF g = 0 THEN RETURN 0; END IF;
  oh := public.fnv1a(id || '#out#' || b::TEXT);
  FOR i IN 0..(g - 1) LOOP
    bit := ((oh >> (i % 32)) & 1)::INT;
    IF bit = 0 THEN w := w + 1; ELSE l := l + 1; END IF;
  END LOOP;
  RETURN w * 20 + l * -10;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6) cumulativeDrift(id, currentBucket) — pesi [1.0,0.7,0.5,0.3,0.2], cap ±500,
--    arrotondato al multiplo di 10. round() di JS = round half away-from-zero
--    su .5 → in SQL usiamo round(x) standard (half up), identico per i valori
--    qui in gioco (somma pesata /10). Verificato in Node che coincide.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_cum_drift(id TEXT, cb INT)
RETURNS INT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  weights NUMERIC[] := ARRAY[1.0, 0.7, 0.5, 0.3, 0.2];
  s NUMERIC := 0;
  i INT;
  b INT;
BEGIN
  FOR i IN 0..4 LOOP
    b := cb - i;
    EXIT WHEN b < 0;
    s := s + public.admin_drift1(id, b)::NUMERIC * weights[i + 1];
  END LOOP;
  IF s > 500 THEN s := 500; END IF;
  IF s < -500 THEN s := -500; END IF;
  -- ⚠️ Math.round(x) = half-UP verso +inf (-2.5 → -2). Postgres round() su
  --    negativi .5 fa half-away-from-zero (-2.5 → -3) → DIVERGE. Replichiamo
  --    Math.round esattamente con floor(x + 0.5). Verificato in Node.
  RETURN (floor(s / 10.0 + 0.5) * 10)::INT;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 7) ELO admin corrente(id, now_ms)
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_elo(id TEXT, now_ms BIGINT)
RETURNS INT
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN GREATEST(100, public.admin_base_elo(id) + public.admin_cum_drift(id, public.admin_bucket(id, now_ms)));
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 8) CAMPIONE DEL GIORNO (classifica COMPLETA: admin + utenti reali).
--    Per ogni giorno NON ancora processato (dall'ultimo+1 a ieri), calcola a
--    mezzanotte UTC l'ELO più alto fra TUTTI (admin simulati + utenti reali con
--    game_elo) e registra il campione. Idempotente (PK su award_date).
--    Se vince un ADMIN, NON si inserisce nulla (i loro titoli sono client-side):
--    si "consuma" comunque il giorno per non riprocessarlo.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_daily_champion_full()
RETURNS TABLE(processed_days INT, awarded_date DATE, winner_kind TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last DATE;
  v_target DATE;
  v_yesterday DATE := (CURRENT_DATE - INTERVAL '1 day')::DATE;
  v_midnight_ms BIGINT;
  v_best_elo INT;
  v_best_admin_id TEXT;
  v_admin_elo INT;
  v_user RECORD;
  v_top_user_id UUID;
  v_top_user_elo INT;
  v_processed INT := 0;
  rec RECORD;
BEGIN
  SELECT MAX(award_date) INTO v_last FROM public.daily_top1_trophies;
  IF v_last IS NULL THEN
    -- parti dal giorno successivo alla EPOCH (2026-05-25)
    v_target := DATE '2026-05-26';
  ELSE
    v_target := (v_last + INTERVAL '1 day')::DATE;
  END IF;

  WHILE v_target <= v_yesterday LOOP
    -- mezzanotte UTC del giorno target, in ms
    v_midnight_ms := (EXTRACT(EPOCH FROM (v_target::timestamp AT TIME ZONE 'UTC')) * 1000)::BIGINT;

    -- migliore tra gli ADMIN (tie-break: id più piccolo)
    v_best_elo := -1;
    v_best_admin_id := NULL;
    FOR rec IN SELECT id::TEXT AS aid FROM public.profiles WHERE is_admin_profile = true LOOP
      v_admin_elo := public.admin_elo(rec.aid, v_midnight_ms);
      IF v_admin_elo > v_best_elo OR (v_admin_elo = v_best_elo AND rec.aid < v_best_admin_id) THEN
        v_best_elo := v_admin_elo;
        v_best_admin_id := rec.aid;
      END IF;
    END LOOP;

    -- migliore tra gli UTENTI REALI (game_elo corrente come proxy)
    SELECT id, COALESCE(game_elo, 1200) INTO v_top_user_id, v_top_user_elo
      FROM public.profiles WHERE is_admin_profile = false
      ORDER BY game_elo DESC NULLS LAST, id ASC LIMIT 1;

    -- chi vince? Se l'utente reale batte (>) il miglior admin → campione utente.
    IF v_top_user_id IS NOT NULL AND v_top_user_elo > v_best_elo THEN
      INSERT INTO public.daily_top1_trophies (award_date, user_id, user_elo)
      VALUES (v_target, v_top_user_id, v_top_user_elo)
      ON CONFLICT (award_date) DO NOTHING;
      UPDATE public.tris_games SET ever_champion = true WHERE user_id = v_top_user_id;
      winner_kind := 'user';
    ELSE
      -- vince un admin: nessuna riga (titoli admin sono client-side), giorno consumato
      winner_kind := 'admin';
    END IF;

    v_processed := v_processed + 1;
    processed_days := v_processed;
    awarded_date := v_target;
    RETURN NEXT;

    v_target := (v_target + INTERVAL '1 day')::DATE;
  END LOOP;

  IF v_processed = 0 THEN
    processed_days := 0; awarded_date := NULL; winner_kind := NULL; RETURN NEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_daily_champion_full() TO authenticated, anon;

-- ───────────────────────────────────────────────────────────────────────────
-- 9) RPC "campione di OGGI" usata dal client quando l'utente è #1 nella
--    classifica completa (myRank===1). Registra subito senza aspettare il cron.
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.award_my_daily_champion()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_elo INT;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT COALESCE(game_elo, 1200) INTO v_elo FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.daily_top1_trophies (award_date, user_id, user_elo)
  VALUES (CURRENT_DATE, v_uid, COALESCE(v_elo, 1200))
  ON CONFLICT (award_date) DO NOTHING;
  UPDATE public.tris_games SET ever_champion = true WHERE user_id = v_uid;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_my_daily_champion() TO authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 10) PULIZIA: cancella i campioni del giorno assegnati dal vecchio sistema
--     (ignorava gli admin) → azzera i Weekly/Monthly fasulli. Si ricostruiscono
--     correttamente da qui in poi.
-- ───────────────────────────────────────────────────────────────────────────
DELETE FROM public.daily_top1_trophies;
UPDATE public.tris_games SET ever_champion = false;

-- ───────────────────────────────────────────────────────────────────────────
-- 11) CRON pg: ogni notte alle 00:10 UTC processa il campione del giorno
--     precedente. Funziona SEMPRE, anche senza utenti. (pg_cron già attivo?)
-- ───────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('daily-champion-full')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-champion-full');
    PERFORM cron.schedule('daily-champion-full', '10 0 * * *',
      $cron$ SELECT public.award_daily_champion_full(); $cron$);
  END IF;
END $$;
