-- Weekly/Monthly Champion permanenti.
-- La streak attuale puo' sbloccare nuovi titoli, ma non deve mai spegnere
-- titoli gia' ottenuti in passato.

BEGIN;

ALTER TABLE public.tris_games
  ADD COLUMN IF NOT EXISTS weekly_champion_titles INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_champion_titles INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.leaderboard_rank_streaks (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_rank INTEGER NOT NULL,
  current_elo INTEGER NOT NULL DEFAULT 1200,
  is_admin_profile BOOLEAN NOT NULL DEFAULT false,
  rank_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  top1_streak_started_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank_streaks_rank
  ON public.leaderboard_rank_streaks(current_rank);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank_streaks_top1
  ON public.leaderboard_rank_streaks(top1_streak_started_at)
  WHERE top1_streak_started_at IS NOT NULL;

ALTER TABLE public.leaderboard_rank_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view leaderboard rank streaks" ON public.leaderboard_rank_streaks;
CREATE POLICY "Anyone can view leaderboard rank streaks"
  ON public.leaderboard_rank_streaks
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Block direct leaderboard streak writes" ON public.leaderboard_rank_streaks;
CREATE POLICY "Block direct leaderboard streak writes"
  ON public.leaderboard_rank_streaks
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.sync_champion_title_counters(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weekly INTEGER := 0;
  v_monthly INTEGER := 0;
  v_ever BOOLEAN := false;
BEGIN
  WITH numbered AS (
    SELECT
      award_date,
      award_date - (row_number() OVER (ORDER BY award_date))::INTEGER AS streak_group
    FROM public.daily_top1_trophies
    WHERE user_id = p_user_id
  ),
  runs AS (
    SELECT count(*)::INTEGER AS run_len
    FROM numbered
    GROUP BY streak_group
  )
  SELECT
    COALESCE(sum(run_len / 7), 0)::INTEGER,
    COALESCE(sum(run_len / 30), 0)::INTEGER,
    EXISTS (SELECT 1 FROM public.daily_top1_trophies WHERE user_id = p_user_id)
  INTO v_weekly, v_monthly, v_ever
  FROM runs;

  INSERT INTO public.tris_games (
    user_id,
    games_played_today,
    last_reset_date,
    ever_champion,
    weekly_champion_titles,
    monthly_champion_titles
  )
  VALUES (
    p_user_id,
    0,
    CURRENT_DATE,
    v_ever,
    v_weekly,
    v_monthly
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    ever_champion = public.tris_games.ever_champion OR EXCLUDED.ever_champion,
    weekly_champion_titles = GREATEST(public.tris_games.weekly_champion_titles, EXCLUDED.weekly_champion_titles),
    monthly_champion_titles = GREATEST(public.tris_games.monthly_champion_titles, EXCLUDED.monthly_champion_titles),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_champion_title_counters(UUID) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.sync_champion_titles_after_daily_top1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_champion_title_counters(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_champion_titles_after_daily_top1 ON public.daily_top1_trophies;
CREATE TRIGGER trg_sync_champion_titles_after_daily_top1
AFTER INSERT OR UPDATE ON public.daily_top1_trophies
FOR EACH ROW
EXECUTE FUNCTION public.sync_champion_titles_after_daily_top1();

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT user_id FROM public.daily_top1_trophies LOOP
    PERFORM public.sync_champion_title_counters(r.user_id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_rank_streaks()
RETURNS TABLE (
  profile_id UUID,
  current_rank INTEGER,
  current_elo INTEGER,
  is_admin_profile BOOLEAN,
  rank_started_at TIMESTAMPTZ,
  top1_streak_started_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  top1_streak_seconds BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_now TIMESTAMPTZ := now();
  v_now_ms BIGINT := (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT;
BEGIN
  DELETE FROM public.leaderboard_rank_streaks s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = s.profile_id
  );

  RETURN QUERY
  WITH scores AS (
    SELECT
      p.id AS score_profile_id,
      CASE
        WHEN COALESCE(p.is_admin_profile, false)
          THEN public.admin_elo(p.id::TEXT, v_now_ms)
        ELSE COALESCE(p.game_elo, 1200)
      END::INTEGER AS score_current_elo,
      COALESCE(p.is_admin_profile, false) AS score_is_admin_profile
    FROM public.profiles p
    WHERE p.id IS NOT NULL
      AND COALESCE(btrim(p.nickname), '') <> ''
  ),
  ranked AS (
    SELECT
      s.score_profile_id,
      s.score_current_elo,
      s.score_is_admin_profile,
      row_number() OVER (ORDER BY s.score_current_elo DESC NULLS LAST, s.score_profile_id ASC)::INTEGER AS score_current_rank
    FROM scores s
  ),
  upserted AS (
    INSERT INTO public.leaderboard_rank_streaks (
      profile_id,
      current_rank,
      current_elo,
      is_admin_profile,
      rank_started_at,
      top1_streak_started_at,
      last_checked_at,
      updated_at
    )
    SELECT
      r.score_profile_id,
      r.score_current_rank,
      r.score_current_elo,
      r.score_is_admin_profile,
      v_now,
      CASE WHEN r.score_current_rank = 1 THEN v_now ELSE NULL END,
      v_now,
      v_now
    FROM ranked r
    ON CONFLICT (profile_id) DO UPDATE
    SET
      current_rank = EXCLUDED.current_rank,
      current_elo = EXCLUDED.current_elo,
      is_admin_profile = EXCLUDED.is_admin_profile,
      rank_started_at = CASE
        WHEN public.leaderboard_rank_streaks.current_rank IS DISTINCT FROM EXCLUDED.current_rank
          THEN v_now
        ELSE public.leaderboard_rank_streaks.rank_started_at
      END,
      top1_streak_started_at = CASE
        WHEN EXCLUDED.current_rank = 1
          AND public.leaderboard_rank_streaks.current_rank = 1
          AND public.leaderboard_rank_streaks.top1_streak_started_at IS NOT NULL
          THEN public.leaderboard_rank_streaks.top1_streak_started_at
        WHEN EXCLUDED.current_rank = 1
          THEN v_now
        ELSE NULL
      END,
      last_checked_at = v_now,
      updated_at = v_now
    RETURNING
      public.leaderboard_rank_streaks.profile_id,
      public.leaderboard_rank_streaks.current_rank,
      public.leaderboard_rank_streaks.current_elo,
      public.leaderboard_rank_streaks.is_admin_profile,
      public.leaderboard_rank_streaks.rank_started_at,
      public.leaderboard_rank_streaks.top1_streak_started_at,
      public.leaderboard_rank_streaks.last_checked_at
  )
  SELECT
    u.profile_id AS profile_id,
    u.current_rank AS current_rank,
    u.current_elo AS current_elo,
    u.is_admin_profile AS is_admin_profile,
    u.rank_started_at AS rank_started_at,
    u.top1_streak_started_at AS top1_streak_started_at,
    u.last_checked_at AS last_checked_at,
    CASE
      WHEN u.top1_streak_started_at IS NULL THEN 0::BIGINT
      ELSE GREATEST(0, EXTRACT(EPOCH FROM (v_now - u.top1_streak_started_at))::BIGINT)
    END AS top1_streak_seconds
  FROM upserted u
  ORDER BY u.current_rank ASC;

  INSERT INTO public.tris_games (
    user_id,
    games_played_today,
    last_reset_date,
    ever_champion,
    weekly_champion_titles,
    monthly_champion_titles
  )
  SELECT
    s.profile_id,
    0,
    CURRENT_DATE,
    true,
    GREATEST(0, floor(EXTRACT(EPOCH FROM (v_now - s.top1_streak_started_at)) / 604800))::INTEGER,
    GREATEST(0, floor(EXTRACT(EPOCH FROM (v_now - s.top1_streak_started_at)) / 2592000))::INTEGER
  FROM public.leaderboard_rank_streaks s
  WHERE s.current_rank = 1
    AND s.top1_streak_started_at IS NOT NULL
    AND COALESCE(s.is_admin_profile, false) = false
  ON CONFLICT (user_id) DO UPDATE
  SET
    ever_champion = true,
    weekly_champion_titles = GREATEST(public.tris_games.weekly_champion_titles, EXCLUDED.weekly_champion_titles),
    monthly_champion_titles = GREATEST(public.tris_games.monthly_champion_titles, EXCLUDED.monthly_champion_titles),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_leaderboard_rank_streaks() TO authenticated, anon;

COMMIT;
