import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ChevronDown, ChevronUp, Crown, Sword, ShieldOff, Equal } from "lucide-react";
import { computeAdminElos, computeAdminStats } from "@/lib/adminElo";

interface LeaderboardProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  elo: number;
  is_admin_profile: boolean;
}

interface EloLeaderboardProps {
  userId?: string;
}

// 🏆 Stats mostrate nel dialog: ELO, V/S/P, trofei TOP 1.
interface ProfileStats {
  elo: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  top1Trophies: number;
}

export const EloLeaderboard = ({ userId }: EloLeaderboardProps) => {
  const [topPlayers, setTopPlayers] = useState<LeaderboardProfile[]>([]);
  const [userElo, setUserElo] = useState<number>(1200);
  const [userRank, setUserRank] = useState<number | null>(null);
  // 🆕 Default true: la classifica e' APERTA appena si entra. Click su tendina
  //    per chiuderla (comportamento richiesto dall'utente).
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // 🆕 Dialog stats profilo cliccato
  const [selectedProfile, setSelectedProfile] = useState<LeaderboardProfile | null>(null);
  const [selectedStats, setSelectedStats] = useState<ProfileStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          is_admin_profile: true,
        })),
        ...(realUsers ?? []).map(p => ({
          id: p.id,
          nickname: p.nickname,
          avatar_url: p.avatar_url,
          elo: p.game_elo ?? 1200,
          is_admin_profile: false,
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

  // 🆕 Click su un profilo della classifica → carica stats e apre dialog
  const handleProfileClick = async (profile: LeaderboardProfile) => {
    setSelectedProfile(profile);
    setSelectedStats(null);
    setLoadingStats(true);

    try {
      if (profile.is_admin_profile) {
        // Admin: stats deterministiche da hash(id) + bucket personale
        const adminStats = computeAdminStats(profile.id);
        setSelectedStats({
          elo: adminStats.elo,
          totalWins: adminStats.totalWins,
          totalLosses: adminStats.totalLosses,
          totalDraws: adminStats.totalDraws,
          top1Trophies: adminStats.top1Trophies,
        });
      } else {
        // Utente reale: legge da tris_games (somma tris+dama)
        const { data: tris } = await supabase
          .from("tris_games")
          .select("*")
          .eq("user_id", profile.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const row = tris as any;
        setSelectedStats({
          elo: profile.elo,
          totalWins: (row?.tris_wins ?? 0) + (row?.dama_wins ?? 0),
          totalLosses: (row?.tris_losses ?? 0) + (row?.dama_losses ?? 0),
          totalDraws: (row?.tris_draws ?? 0) + (row?.dama_draws ?? 0),
          // Trofei TOP 1 utenti reali: TODO futuro (richiede campo dedicato
          // o tabella history posizioni). Per ora 0 — onesti.
          top1Trophies: 0,
        });
      }
    } catch (e) {
      console.error("Errore caricamento stats profilo:", e);
      setSelectedStats({
        elo: profile.elo,
        totalWins: 0,
        totalLosses: 0,
        totalDraws: 0,
        top1Trophies: 0,
      });
    } finally {
      setLoadingStats(false);
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

  // Indice posizione del profilo selezionato nella TOP 5 (per il trofeo nel dialog)
  const selectedProfileIndex = selectedProfile
    ? topPlayers.findIndex((p) => p.id === selectedProfile.id)
    : -1;

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

      {/* Leaderboard - Collapsible (default APERTA) */}
      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
        {/* Header - Clickable per toggle */}
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
              <button
                type="button"
                key={player.id}
                onClick={() => handleProfileClick(player)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left cursor-pointer ${
                  player.id === userId
                    ? "bg-primary/20 border-2 border-primary hover:bg-primary/30"
                    : "bg-background/50 hover:bg-background/80 hover:scale-[1.01] hover:shadow-md"
                }`}
              >
                {/* Rank and Trophy */}
                <div className="flex items-center justify-center w-10 shrink-0">
                  {getTrophyIcon(index)}
                </div>

                {/* Avatar */}
                <Avatar className="w-10 h-10 border-2 border-primary/50 shrink-0">
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
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">ELO</p>
                  <p className="font-bold text-lg text-primary">
                    {player.elo}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* 🆕 Dialog profilo cliccato — banner con stats complete */}
      <Dialog open={!!selectedProfile} onOpenChange={(open) => !open && setSelectedProfile(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {selectedProfile && (
            <>
              {/* Header con gradient + avatar grande */}
              <div className="relative bg-gradient-to-br from-primary/40 via-purple-500/30 to-pink-500/40 p-6 pb-12">
                <DialogHeader>
                  <DialogTitle className="sr-only">{selectedProfile.nickname}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center gap-3">
                  {/* Trofeo di posizione (se in TOP 5) */}
                  {selectedProfileIndex >= 0 && selectedProfileIndex < 5 && (
                    <div className="scale-125">{getTrophyIcon(selectedProfileIndex)}</div>
                  )}
                  <Avatar className="w-24 h-24 border-4 border-white/40 shadow-2xl">
                    <AvatarImage src={getAvatarUrl(selectedProfile.avatar_url)} />
                    <AvatarFallback className="text-3xl bg-primary/20">
                      {selectedProfile.nickname.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-white drop-shadow-lg">
                      {selectedProfile.nickname}
                    </h3>
                    {selectedProfileIndex >= 0 && (
                      <p className="text-sm text-white/90 mt-1">
                        #{selectedProfileIndex + 1} in classifica
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Body con stats */}
              <div className="px-6 py-5 -mt-6 bg-background relative rounded-t-3xl">
                {loadingStats ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : selectedStats ? (
                  <div className="space-y-4">
                    {/* ELO grande, centrato */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Score ELO</p>
                      <p className="text-4xl font-bold text-primary">{selectedStats.elo}</p>
                    </div>

                    {/* Trofei TOP 1 — chip evidenziato */}
                    <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40">
                      <Crown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-semibold">Trofei TOP 1 ottenuti:</span>
                      <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                        {selectedStats.top1Trophies}
                      </span>
                      <span className="text-xl">🏆</span>
                    </div>

                    {/* V / S / P in 3 colonne */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col items-center p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <Sword className="w-4 h-4 text-green-600 dark:text-green-400 mb-1" />
                        <span className="text-xs text-muted-foreground">Vittorie</span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          {selectedStats.totalWins}
                        </span>
                      </div>
                      <div className="flex flex-col items-center p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                        <ShieldOff className="w-4 h-4 text-red-600 dark:text-red-400 mb-1" />
                        <span className="text-xs text-muted-foreground">Sconfitte</span>
                        <span className="text-lg font-bold text-red-600 dark:text-red-400">
                          {selectedStats.totalLosses}
                        </span>
                      </div>
                      <div className="flex flex-col items-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <Equal className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mb-1" />
                        <span className="text-xs text-muted-foreground">Pareggi</span>
                        <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                          {selectedStats.totalDraws}
                        </span>
                      </div>
                    </div>

                    {/* Win rate */}
                    {(selectedStats.totalWins + selectedStats.totalLosses + selectedStats.totalDraws) > 0 && (
                      <div className="text-center text-xs text-muted-foreground">
                        Win rate:{" "}
                        <span className="font-semibold text-foreground">
                          {Math.round(
                            (selectedStats.totalWins /
                              (selectedStats.totalWins +
                                selectedStats.totalLosses +
                                selectedStats.totalDraws)) *
                              100
                          )}
                          %
                        </span>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
