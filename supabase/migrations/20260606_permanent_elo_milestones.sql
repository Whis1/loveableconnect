-- Apex/Zenith permanenti.
-- Apex si ottiene raggiungendo 2.500 ELO almeno una volta.
-- Zenith si ottiene raggiungendo 3.000 ELO almeno una volta.

BEGIN;

ALTER TABLE public.tris_games
  ADD COLUMN IF NOT EXISTS max_elo_reached INTEGER NOT NULL DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS apex_unlocked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS zenith_unlocked BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.sync_elo_milestone_titles(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_elo INTEGER := 1200;
  v_snapshot_max INTEGER := 1200;
  v_peak INTEGER := 1200;
BEGIN
  SELECT COALESCE(game_elo, 1200)
  INTO v_current_elo
  FROM public.profiles
  WHERE id = p_user_id
    AND COALESCE(is_admin_profile, false) = false;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF to_regclass('public.elo_daily_snapshots') IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(MAX(elo), 1200) FROM public.elo_daily_snapshots WHERE user_id = $1'
    INTO v_snapshot_max
    USING p_user_id;
  END IF;

  SELECT GREATEST(
    1200,
    v_current_elo,
    COALESCE(v_snapshot_max, 1200),
    COALESCE(max_elo_reached, 1200)
  )
  INTO v_peak
  FROM public.tris_games
  WHERE user_id = p_user_id;

  IF v_peak IS NULL THEN
    v_peak := GREATEST(1200, v_current_elo, COALESCE(v_snapshot_max, 1200));
  END IF;

  INSERT INTO public.tris_games (
    user_id,
    games_played_today,
    last_reset_date,
    max_elo_reached,
    apex_unlocked,
    zenith_unlocked
  )
  VALUES (
    p_user_id,
    0,
    CURRENT_DATE,
    v_peak,
    v_peak >= 2500,
    v_peak >= 3000
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    max_elo_reached = GREATEST(public.tris_games.max_elo_reached, EXCLUDED.max_elo_reached),
    apex_unlocked = public.tris_games.apex_unlocked OR EXCLUDED.apex_unlocked,
    zenith_unlocked = public.tris_games.zenith_unlocked OR EXCLUDED.zenith_unlocked,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_elo_milestone_titles(UUID) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.sync_elo_milestones_after_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.is_admin_profile, false) = false THEN
    PERFORM public.sync_elo_milestone_titles(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_elo_milestones_after_profile ON public.profiles;
CREATE TRIGGER trg_sync_elo_milestones_after_profile
AFTER INSERT OR UPDATE OF game_elo ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_elo_milestones_after_profile();

CREATE OR REPLACE FUNCTION public.update_game_elo(user_id uuid, elo_change integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET game_elo = GREATEST(0, COALESCE(game_elo, 1200) + elo_change)
  WHERE id = user_id;

  PERFORM public.sync_elo_milestone_titles(user_id);

  IF to_regprocedure('public.refresh_leaderboard_rank_streaks()') IS NOT NULL THEN
    PERFORM public.refresh_leaderboard_rank_streaks();
  END IF;
END;
$$;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id
    FROM public.profiles
    WHERE COALESCE(is_admin_profile, false) = false
  LOOP
    PERFORM public.sync_elo_milestone_titles(r.id);
  END LOOP;
END $$;

COMMIT;
