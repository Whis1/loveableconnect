import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { computeAdminElos } from "@/lib/adminElo";

interface LeaderboardProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  elo: number;
}

interface EloLeaderboardProps {
  userId?: string;
}

export const EloLeaderboard = ({ userId }: EloLeaderboardProps) => {
  const [topPlayers, setTopPlayers] = useState<LeaderboardProfile[]>([]);
  const [userElo, setUserElo] = useState<number>(1200);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    fetchLeaderboard();
  }, [userId]);

  const fetchLeaderboard = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Tutti i profili admin + i migliori utenti reali
      const { data: admins } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, game_elo")
        .eq("is_admin_profile", true);

      const { data: realUsers } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, game_elo")
        .eq("is_admin_profile", false)
        .order("game_elo", { ascending: false })
        .limit(10);

      // ELO simulati degli admin (cambiano ogni 3 ore)
      const adminElos = computeAdminElos(admins ?? []);

      const entries: LeaderboardProfile[] = [
        ...(admins ?? []).map(p => ({
          id: p.id,
          nickname: p.nickname,
          avatar_url: p.avatar_url,
          elo: adminElos.get(p.id) ?? 1200,
        })),
        ...(realUsers ?? []).map(p => ({
          id: p.id,
          nickname: p.nickname,
          avatar_url: p.avatar_url,
          elo: p.game_elo ?? 1200,
        })),
      ].sort((a, b) => b.elo - a.elo);

      setTopPlayers(entries.slice(0, 5));

      // ELO e posizione dell'utente corrente
      if (userId) {
        const mine = entries.find(e => e.id === userId);
        let myElo = mine?.elo;
        if (myElo === undefined) {
          const { data: myProfile } = await supabase
            .from("profiles")
            .select("game_elo")
            .eq("id", userId)
            .maybeSingle();
          myElo = myProfile?.game_elo ?? 1200;
        }
        setUserElo(myElo);

        let higher = 0;
        adminElos.forEach(e => {
          if (e > (myElo as number)) higher++;
        });
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_admin_profile", false)
          .gt("game_elo", myElo);
        setUserRank(higher + (count ?? 0) + 1);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) return "";
    if (avatarPath.startsWith("http")) return avatarPath;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/profile-images/${avatarPath}`;
  };

  const getTrophyIcon = (position: number) => {
    switch (position) {
      case 0:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-full blur-sm opacity-75 animate-pulse" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-yellow-300">
              🏆
            </div>
          </div>
        );
      case 1:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 rounded-full blur-sm opacity-60" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-500 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-gray-300">
              🥈
            </div>
          </div>
        );
      case 2:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-600 to-orange-700 rounded-full blur-sm opacity-60" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-orange-300 via-amber-500 to-orange-600 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-orange-400">
              🥉
            </div>
          </div>
        );
      case 3:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 rounded-full blur-sm opacity-50" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-blue-300 via-blue-400 to-blue-600 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-blue-300">
              🎖️
            </div>
          </div>
        );
      case 4:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-full blur-sm opacity-50" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-purple-300 via-purple-400 to-purple-600 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-purple-300">
              🏅
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getRankDisplay = () => {
    if (!userRank) return "N/A";
    if (userRank === 1) return "1° 🥇";
    if (userRank === 2) return "2° 🥈";
    if (userRank === 3) return "3° 🥉";
    return `${userRank}°`;
  };

  return (
    <div className="space-y-4">
      {/* User's ELO and Rank */}
      {userId && (
        <Card className="p-4 bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Il tuo ELO</p>
              <p className="text-3xl font-bold text-primary">{userElo}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Posizione classifica</p>
              <p className="text-2xl font-bold">{getRankDisplay()}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Leaderboard - Collapsible */}
      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
        {/* Header - Clickable */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h4 className="font-bold text-lg">Classifica ELO - TOP 5</h4>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-primary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-primary" />
          )}
        </button>

        {/* Collapsible Content */}
        {isOpen && (
          <div className="p-4 pt-0 space-y-3">
            {topPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  player.id === userId
                    ? "bg-primary/20 border-2 border-primary"
                    : "bg-background/50 hover:bg-background/80"
                }`}
              >
                {/* Rank and Trophy */}
                <div className="flex items-center justify-center w-10">
                  {getTrophyIcon(index)}
                </div>

                {/* Avatar */}
                <Avatar className="w-10 h-10 border-2 border-primary/50">
                  <AvatarImage src={getAvatarUrl(player.avatar_url)} />
                  <AvatarFallback>
                    {player.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {player.nickname}
                    {player.id === userId && (
                      <span className="text-xs text-primary ml-2">(Tu)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    #{index + 1} in classifica
                  </p>
                </div>

                {/* ELO */}
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">ELO</p>
                  <p className="font-bold text-lg text-primary">
                    {player.elo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};