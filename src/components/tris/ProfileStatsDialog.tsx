import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Sword, ShieldOff } from "lucide-react";
import { computeAdminStats } from "@/lib/adminElo";
import { renderRankBadge, getRankNicknameClass } from "./EloLeaderboard";

interface ProfileLike {
  id: string;
  nickname: string;
  avatar_url: string | null;
  elo?: number;                 // ELO da mostrare (per admin: simulato, per utenti reali: game_elo)
  is_admin_profile: boolean;
}

interface ProfileStats {
  elo: number;
  totalWins: number;
  totalLosses: number;
  top1Trophies: number;
}

interface Props {
  profile: ProfileLike | null;
  onClose: () => void;
  // Posizione nella TOP 5 (per il trofeo header). null = non mostrare posizione.
  // Su richiesta utente non viene MAI mostrata durante le partite.
  topIndex?: number | null;
  // Mostra anche la "posizione classifica" sotto al nome. False di default.
  showRank?: boolean;
}

// 🏆 Dialog stats profilo: usato sia in EloLeaderboard (con showRank=true) sia
// nelle partite TrisBoard/CheckersBoard (con showRank=false). Carica le stats
// in modo asincrono al click; per admin usa computeAdminStats(id, allAdmins);
// per utenti reali legge da tris_games.
export const ProfileStatsDialog = ({ profile, onClose, topIndex = null, showRank = true }: Props) => {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(false);

  // 🐛 FIX LOOP RICARICA: prima la dep era [profile] (l'intero oggetto).
  // TrisBoard/CheckersBoard ricreano un NUOVO oggetto profile ad ogni render
  // (per includere l'elo calcolato), quindi la reference cambiava ogni volta
  // → useEffect ri-eseguiva → loop infinito di fetch.
  // Ora dep solo [profile?.id, profile?.is_admin_profile]: cambia SOLO quando
  // si seleziona un altro profilo (id diverso), non ad ogni render del parent.
  useEffect(() => {
    if (!profile) {
      setStats(null);
      return;
    }
    let cancelled = false;
    const profileId = profile.id;
    const isAdmin = profile.is_admin_profile;
    const fallbackElo = profile.elo ?? (isAdmin ? 1200 : 1200);

    (async () => {
      setLoading(true);
      try {
        if (isAdmin) {
          const { data: admins } = await supabase
            .from("profiles")
            .select("id")
            .eq("is_admin_profile", true);
          if (cancelled) return;

          const adminStats = computeAdminStats(profileId, admins ?? []);
          setStats({
            elo: fallbackElo ?? adminStats.elo,
            totalWins: adminStats.totalWins,
            totalLosses: adminStats.totalLosses,
            top1Trophies: adminStats.top1Trophies,
          });
        } else {
          const { data: tris } = await supabase
            .from("tris_games")
            .select("*")
            .eq("user_id", profileId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (cancelled) return;

          const row = tris as any;
          setStats({
            elo: fallbackElo,
            totalWins: (row?.tris_wins ?? 0) + (row?.dama_wins ?? 0),
            totalLosses: (row?.tris_losses ?? 0) + (row?.dama_losses ?? 0),
            top1Trophies: row?.top_1_trophies ?? 0,
          });
        }
      } catch (e) {
        console.error("ProfileStatsDialog stats load error:", e);
        if (!cancelled) {
          setStats({
            elo: fallbackElo,
            totalWins: 0,
            totalLosses: 0,
            top1Trophies: 0,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Solo l'id (e il tipo admin/user) trigggera il refetch — non l'oggetto intero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.is_admin_profile]);

  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) return "";
    if (avatarPath.startsWith("http")) return avatarPath;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/profile-images/${avatarPath}`;
  };

  const getTrophyIcon = (position: number) => {
    switch (position) {
      case 0:
        return <span className="text-3xl">🏆</span>;
      case 1:
        return <span className="text-3xl">🥈</span>;
      case 2:
        return <span className="text-3xl">🥉</span>;
      case 3:
        return <span className="text-3xl">🎖️</span>;
      case 4:
        return <span className="text-3xl">🏅</span>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={!!profile} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {profile && (
          <>
            <div className="relative bg-gradient-to-br from-primary/40 via-purple-500/30 to-pink-500/40 p-6 pb-12">
              <DialogHeader>
                <DialogTitle className="sr-only">{profile.nickname}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3">
                {showRank && topIndex !== null && topIndex >= 0 && topIndex < 5 && (
                  <div>{getTrophyIcon(topIndex)}</div>
                )}
                <Avatar className="w-24 h-24 border-4 border-white/40 shadow-2xl">
                  <AvatarImage src={getAvatarUrl(profile.avatar_url)} />
                  <AvatarFallback className="text-3xl bg-primary/20">
                    {profile.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-2xl font-bold drop-shadow-lg">
                    {showRank && topIndex !== null && topIndex >= 0 && topIndex < 5 ? (
                      <span className={getRankNicknameClass(topIndex)}>{profile.nickname}</span>
                    ) : (
                      <span className="text-white">{profile.nickname}</span>
                    )}
                  </h3>
                  {showRank && topIndex !== null && topIndex >= 0 && (
                    <div className="mt-2">{renderRankBadge(topIndex, "md")}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-5 -mt-6 bg-background relative rounded-t-3xl">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : stats ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.3em] font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(244,114,182,0.4)]">
                      ELO
                    </p>
                    <p className="text-4xl font-bold text-primary drop-shadow-[0_0_12px_rgba(244,114,182,0.5)]">
                      {stats.elo}
                    </p>
                  </div>

                  {/* 🏆 Campione del giorno: trofeo dato a chi e' #1 in classifica
                      a mezzanotte UTC. Mostrato sempre in classifica, solo se >0
                      durante le partite. Tooltip cliccabile/hover che spiega
                      come si ottiene. */}
                  {(showRank || stats.top1Trophies > 0) && (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 hover:from-yellow-500/30 hover:to-amber-500/30 transition-colors cursor-help"
                          >
                            <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-sm font-semibold">Campione del giorno:</span>
                            <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                              {stats.top1Trophies}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-center leading-relaxed">
                          Ogni giorno, alle ore 00:00, il sistema verifica la
                          classifica ELO. Il profilo che occupa la prima
                          posizione in quel momento riceve il trofeo{" "}
                          <strong>“Campione del Giorno”</strong>. Il numero
                          riportato indica quante volte il profilo ha concluso
                          la giornata al primo posto in classifica.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                      <Sword className="w-4 h-4 text-green-600 dark:text-green-400 mb-1" />
                      <span className="text-xs text-muted-foreground">Vittorie</span>
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {stats.totalWins}
                      </span>
                    </div>
                    <div className="flex flex-col items-center p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <ShieldOff className="w-4 h-4 text-red-600 dark:text-red-400 mb-1" />
                      <span className="text-xs text-muted-foreground">Sconfitte</span>
                      <span className="text-lg font-bold text-red-600 dark:text-red-400">
                        {stats.totalLosses}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
