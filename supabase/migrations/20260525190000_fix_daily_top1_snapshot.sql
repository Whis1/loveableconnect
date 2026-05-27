-- 🏆 FIX: assegnazione trofeo "Campione del giorno" usava il top user
--    NEL MOMENTO della chiamata invece di chi era top a mezzanotte UTC.
--
-- Bug originale (migration 20260524215503): la RPC award_daily_top1_if_needed
-- faceva SELECT da profiles ORDER BY game_elo DESC per assegnare il trofeo
-- di un giorno passato. Risultato: se Mareblu1 era prima ieri ma oggi è stata
-- sorpassata, il trofeo veniva (erroneamente) assegnato al sorpassante.
--
-- Fix: nuova tabella elo_daily_snapshots che salva la classifica ad ogni
-- chiamata della RPC. Per assegnare il trofeo del giorno D, ora usa lo
-- snapshot più vicino DOPO mezzanotte UTC di D (cioè il primo del giorno
-- D+1), che è la migliore approssimazione disponibile dello stato a
-- mezzanotte UTC. Fallback su classifica attuale se nessuno snapshot
-- esiste (retrocompatibile col vecchio comportamento).

-- 1. Tabella snapshot giornaliera della classifica utenti reali
CREATE TABLE IF NOT EXISTS public.elo_daily_snapshots (
  snapshot_date DATE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  elo INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, user_id)
);

CREATE INDEX IF NOT EXISTS idx_elo_snapshots_date_elo
  ON public.elo_daily_snapshots(snapshot_date, elo DESC);

ALTER TABLE public.elo_daily_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view elo snapshots" ON public.elo_daily_snapshots;
CREATE POLICY "Anyone can view elo snapshots"
  ON public.elo_daily_snapshots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Block direct insert elo snapshots" ON public.elo_daily_snapshots;
CREATE POLICY "Block direct insert elo snapshots"
  ON public.elo_daily_snapshots FOR INSERT WITH CHECK (false);

-- 2. RPC aggiornata: snapshot oggi + uso snapshot per assegnare trofei passati
CREATE OR REPLACE FUNCTION public.award_daily_top1_if_needed()
RETURNS TABLE(processed_days INTEGER, awarded_to UUID, awarded_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_processed DATE;
  v_target_date DATE;
  v_yesterday DATE := (CURRENT_DATE - INTERVAL '1 day')::DATE;
  v_top_user_id UUID;
  v_top_elo INTEGER;
  v_processed INTEGER := 0;
  v_snapshot_date DATE;
BEGIN
  -- 📸 STEP 1: salva snapshot della classifica corrente per OGGI (idempotente
  --    grazie alla PRIMARY KEY). Questo snapshot servirà domani per
  --    determinare chi era top oggi.
  INSERT INTO public.elo_daily_snapshots (snapshot_date, user_id, elo)
  SELECT CURRENT_DATE, p.id, COALESCE(p.game_elo, 1200)
  FROM public.profiles p
  WHERE p.is_admin_profile = false
  ON CONFLICT (snapshot_date, user_id) DO NOTHING;

  -- 🎯 STEP 2: processa i giorni passati non ancora processati
  SELECT MAX(award_date) INTO v_last_processed FROM public.daily_top1_trophies;

  IF v_last_processed IS NULL THEN
    v_target_date := v_yesterday;
  ELSE
    v_target_date := (v_last_processed + INTERVAL '1 day')::DATE;
  END IF;

  WHILE v_target_date <= v_yesterday LOOP
    -- Cerca lo snapshot più vicino DOPO v_target_date (cioè il primo snapshot
    -- dei giorni successivi). Quello è il dato più vicino allo stato della
    -- classifica a mezzanotte UTC di v_target_date.
    SELECT snapshot_date INTO v_snapshot_date
    FROM public.elo_daily_snapshots
    WHERE snapshot_date > v_target_date
    ORDER BY snapshot_date ASC
    LIMIT 1;

    v_top_user_id := NULL;
    v_top_elo := NULL;

    IF v_snapshot_date IS NOT NULL THEN
      -- ✅ Usa lo snapshot: top user di quello snapshot
      SELECT user_id, elo
        INTO v_top_user_id, v_top_elo
        FROM public.elo_daily_snapshots
        WHERE snapshot_date = v_snapshot_date
        ORDER BY elo DESC NULLS LAST
        LIMIT 1;
    ELSE
      -- ⚠️ Fallback: nessuno snapshot disponibile → usa la classifica attuale
      --    (comportamento vecchio, meno accurato ma non blocca l'assegnazione)
      SELECT id, COALESCE(game_elo, 1200)
        INTO v_top_user_id, v_top_elo
        FROM public.profiles
        WHERE is_admin_profile = false
        ORDER BY game_elo DESC NULLS LAST
        LIMIT 1;
    END IF;

    IF v_top_user_id IS NOT NULL THEN
      INSERT INTO public.daily_top1_trophies (award_date, user_id, user_elo)
      VALUES (v_target_date, v_top_user_id, v_top_elo)
      ON CONFLICT (award_date) DO NOTHING;

      UPDATE public.tris_games
      SET top_1_trophies = top_1_trophies + 1
      WHERE user_id = v_top_user_id;

      INSERT INTO public.tris_games (user_id, games_played_today, last_reset_date, top_1_trophies)
      VALUES (v_top_user_id, 0, CURRENT_DATE, 1)
      ON CONFLICT DO NOTHING;

      v_processed := v_processed + 1;

      RETURN QUERY SELECT v_processed, v_top_user_id, v_target_date;
    END IF;

    v_target_date := (v_target_date + INTERVAL '1 day')::DATE;
  END LOOP;

  IF v_processed = 0 THEN
    RETURN QUERY SELECT 0, NULL::UUID, NULL::DATE;
  END IF;
END;
$$;
