-- 🏆 Snapshot giornaliero trofei TOP 1.
--
-- Sostituisce il sistema "transizione" (trofeo ad ogni salita al #1, che
-- poteva essere exploitato perdendo apposta per risalire). Ora c'e' un
-- meccanismo classico "champion of the day": chi e' #1 in classifica a
-- mezzanotte UTC ottiene 1 trofeo.
--
-- Architettura:
--   - Tabella daily_top1_trophies(award_date PRIMARY KEY) → 1 sola riga per
--     giorno, garantisce idempotenza (no doppi trofei per lo stesso giorno).
--   - RPC award_daily_top1_if_needed(): chiamata dal client (es. apertura
--     pagina giochi). Per ogni giorno NON ancora processato (dall'ultimo
--     processato a ieri), assegna il trofeo al miglior utente reale di
--     quel giorno (best effort: usa game_elo correnti come proxy, assumendo
--     che gli ELO degli utenti non cambino di molto nel giorno).
--
-- Per gli admin il giornaliero e' simulato lato client da computeAdminElos
-- iterando i giorni dall'EPOCH (vedere lib/adminElo.ts).

CREATE TABLE IF NOT EXISTS public.daily_top1_trophies (
  award_date DATE PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_elo INTEGER NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_top1_trophies ENABLE ROW LEVEL SECURITY;

-- SELECT pubblica (per mostrare storia in UI futura)
DROP POLICY IF EXISTS "Anyone can view daily top1 trophies" ON public.daily_top1_trophies;
CREATE POLICY "Anyone can view daily top1 trophies"
  ON public.daily_top1_trophies FOR SELECT USING (true);

-- INSERT solo via RPC (SECURITY DEFINER)
DROP POLICY IF EXISTS "Block direct insert" ON public.daily_top1_trophies;
CREATE POLICY "Block direct insert"
  ON public.daily_top1_trophies FOR INSERT WITH CHECK (false);

-- 🎯 RPC: per ogni giorno non ancora processato (dall'ultimo +1 a ieri),
-- assegna il trofeo all'utente reale con game_elo piu' alto in quel momento.
-- Non assegna mai per oggi (la classifica di oggi e' ancora in evoluzione).
-- Idempotente: la PRIMARY KEY su award_date previene duplicati.
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
BEGIN
  -- Ultimo giorno gia' processato (max award_date nella tabella)
  SELECT MAX(award_date) INTO v_last_processed FROM public.daily_top1_trophies;

  -- Se mai processato, parti da ieri (max 1 trofeo per backfill iniziale)
  IF v_last_processed IS NULL THEN
    v_target_date := v_yesterday;
  ELSE
    v_target_date := (v_last_processed + INTERVAL '1 day')::DATE;
  END IF;

  -- Loop da v_target_date a v_yesterday
  WHILE v_target_date <= v_yesterday LOOP
    -- Trova l'utente reale con game_elo piu' alto (escludi admin profile)
    SELECT id, COALESCE(game_elo, 1200)
      INTO v_top_user_id, v_top_elo
      FROM public.profiles
      WHERE is_admin_profile = false
      ORDER BY game_elo DESC NULLS LAST
      LIMIT 1;

    -- Solo se c'e' almeno un utente reale
    IF v_top_user_id IS NOT NULL THEN
      -- Inserisci il record giornaliero (PRIMARY KEY previene duplicati)
      INSERT INTO public.daily_top1_trophies (award_date, user_id, user_elo)
      VALUES (v_target_date, v_top_user_id, v_top_elo)
      ON CONFLICT (award_date) DO NOTHING;

      -- Incrementa il counter trofei dell'utente
      UPDATE public.tris_games
      SET top_1_trophies = top_1_trophies + 1
      WHERE user_id = v_top_user_id;

      -- Se la riga tris_games non esiste, creala
      INSERT INTO public.tris_games (user_id, games_played_today, last_reset_date, top_1_trophies)
      VALUES (v_top_user_id, 0, CURRENT_DATE, 1)
      ON CONFLICT DO NOTHING;

      v_processed := v_processed + 1;

      RETURN QUERY SELECT v_processed, v_top_user_id, v_target_date;
    END IF;

    v_target_date := (v_target_date + INTERVAL '1 day')::DATE;
  END LOOP;

  -- Se nessun giorno processato, restituisci una riga vuota
  IF v_processed = 0 THEN
    RETURN QUERY SELECT 0, NULL::UUID, NULL::DATE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_daily_top1_if_needed() TO authenticated;
