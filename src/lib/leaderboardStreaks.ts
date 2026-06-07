import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardRankStreak {
  profile_id: string;
  current_rank: number;
  current_elo: number;
  is_admin_profile: boolean;
  rank_started_at: string | null;
  top1_streak_started_at: string | null;
  last_checked_at: string | null;
  top1_streak_seconds: number;
}

export async function refreshLeaderboardRankStreaks(): Promise<LeaderboardRankStreak[]> {
  const { data, error } = await supabase.rpc("refresh_leaderboard_rank_streaks" as any);
  if (error) {
    console.warn("refresh_leaderboard_rank_streaks non disponibile o non applicata:", error);
    return [];
  }
  return (data ?? []) as LeaderboardRankStreak[];
}

export function streakMapByProfileId(rows: LeaderboardRankStreak[]) {
  return new Map(rows.map((row) => [row.profile_id, row]));
}
