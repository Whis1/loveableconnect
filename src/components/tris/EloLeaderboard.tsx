import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ChevronDown, ChevronUp, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { computeChampionBadges, dateStringToDayNumber, ChampionBadges } from "@/lib/championBadges";
import { ChampionBadgesRow } from "./ChampionBadgesRow";
import { CampioneIcon, RankMedalIcon } from "@/lib/championIcons";
import { computeAdminElos } from "@/lib/adminElo";
import { ProfileStatsDialog } from "./ProfileStatsDialog";
import { VictoryIcon, DefeatIcon } from "@/lib/gameIcons";

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

// 🎨 Badge esportato per riuso (ProfileStatsDialog ecc).
// Gradient e colori coerenti col tema rosa/viola/oro. NIENTE emoji nel badge
// (su richiesta utente: solo testo pulito).
export function renderRankBadge(position: number, size: "sm" | "md" = "sm") {
  const pad = size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs";
  // Testo SCURO a tema del colore di sfondo (no bianco, no nero pieno):
  // marrone scuro su oro, grigio scuro su argento, ecc. → contrasto alto +
  // palette armoniosa.
  const styles = [
    {
      bg: "bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 text-amber-950 shadow shadow-yellow-500/40 border border-yellow-300/60",
      label: "Campione",
    },
    {
      bg: "bg-gradient-to-r from-gray-200 via-slate-300 to-gray-400 text-slate-800 shadow shadow-gray-400/40 border border-gray-300/60",
      label: "2° posto",
    },
    {
      bg: "bg-gradient-to-r from-orange-300 via-amber-500 to-orange-600 text-orange-950 shadow shadow-orange-500/40 border border-orange-300/60",
      label: "3° posto",
    },
    {
      bg: "bg-gradient-to-r from-blue-300 via-blue-400 to-indigo-500 text-indigo-950 shadow shadow-blue-500/40 border border-blue-300/60",
      label: "4° posto",
    },
    {
      bg: "bg-gradient-to-r from-purple-300 via-pink-400 to-rose-500 text-rose-950 shadow shadow-pink-500/40 border border-pink-300/60",
      label: "5° posto",
    },
  ];
  const style = styles[position];
  if (!style) return null;
  return (
    <span
      className={`inline-flex items-center ${pad} rounded-full font-black tracking-wide ${style.bg}`}
    >
      {style.label}
    </span>
  );
}

// 🎨 Stile del NOME del profilo nella classifica: gradient text + effetti
// (drop-shadow / glow) coerenti col rank. SENZA contenitori: il colore del
// testo cambia direttamente.
export function getRankNicknameClass(position: number): string {
  switch (position) {
    case 0: // Oro Campione — testo gradient + glow giallo
      return "bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]";
    case 1: // Argento — gradient grigio chiaro lucido
      return "bg-gradient-to-r from-gray-200 via-slate-300 to-gray-400 bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(148,163,184,0.6)]";
    case 2: // Bronzo
      return "bg-gradient-to-r from-orange-400 via-amber-500 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(251,146,60,0.6)]";
    case 3: // Blu
      return "bg-gradient-to-r from-blue-300 via-blue-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(96,165,250,0.6)]";
    case 4: // Viola/Rosa — tema sito
      return "bg-gradient-to-r from-purple-300 via-pink-400 to-rose-500 bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(244,114,182,0.6)]";
    default:
      return "";
  }
}

export const EloLeaderboard = ({ userId }: EloLeaderboardProps) => {
  const [topPlayers, setTopPlayers] = useState<LeaderboardProfile[]>([]);
  const [userElo, setUserElo] = useState<number>(1200);
  const [userRank, setUserRank] = useState<number | null>(null);
  // 👤 Profilo dell'utente loggato: serve per avatar + nickname nella card stile partita
  const [userProfile, setUserProfile] = useState<{
    nickname: string | null;
    full_name: string;
    avatar_url: string | null;
  } | null>(null);
  // 🏆 Stats personali dell'utente: V/S/trofei/tornei_vinti + titoli campione
  const [userStats, setUserStats] = useState<{
    wins: number;
    losses: number;
    trophies: number;
    tournamentsWon: number;
    badges: ChampionBadges;
  } | null>(null);
  // 🆕 Default true: la classifica è APERTA appena si entra. Click sulla
  // tendina per chiuderla.
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<LeaderboardProfile | null>(null);

  useEffect(() => {
    if (isLoading) return;
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchLeaderboard = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // 🏆 Best-effort: assegna eventuali trofei TOP 1 giornalieri arretrati
    // (chi era #1 a mezzanotte UTC di un giorno non ancora processato).
    // Idempotente lato server (PRIMARY KEY su daily_top1_trophies.award_date).
    try {
      const { data: awardResult } = await supabase.rpc('award_daily_top1_if_needed' as any);
      if (Array.isArray(awardResult) && awardResult[0]?.processed_days > 0) {
        console.log('🏆 Trofei TOP 1 giornalieri assegnati:', awardResult);
      }
    } catch (e) {
      console.warn('award_daily_top1 non disponibile (migration da applicare?):', e);
    }

    try {
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

      const adminElos = computeAdminElos(admins ?? []);

      const entries: LeaderboardProfile[] = [
        ...(admins ?? []).map((p) => ({
          id: p.id,
          nickname: p.nickname,
          avatar_url: p.avatar_url,
          elo: adminElos.get(p.id) ?? 1200,
          is_admin_profile: true,
        })),
        ...(realUsers ?? []).map((p) => ({
          id: p.id,
          nickname: p.nickname,
          avatar_url: p.avatar_url,
          elo: p.game_elo ?? 1200,
          is_admin_profile: false,
        })),
      ].sort((a, b) => b.elo - a.elo);

      setTopPlayers(entries.slice(0, 5));

      if (userId) {
        const mine = entries.find((e) => e.id === userId);
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
        adminElos.forEach((e) => {
          if (e > (myElo as number)) higher++;
        });
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_admin_profile", false)
          .gt("game_elo", myElo);
        setUserRank(higher + (count ?? 0) + 1);

        // 🏆 Carica vittorie/sconfitte/trofei/tornei_vinti dell'utente da tris_games
        const { data: tris } = await supabase
          .from("tris_games")
          .select("tris_wins, tris_losses, dama_wins, dama_losses, othello_wins, othello_losses, top_1_trophies, tournaments_won")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // 🏅 Titoli campione: giorni in cui l'utente è stato #1 (daily_top1_trophies)
        const { data: champRows } = await supabase
          .from("daily_top1_trophies")
          .select("award_date")
          .eq("user_id", userId);
        const champDays = (champRows ?? []).map((r: any) => dateStringToDayNumber(r.award_date));

        const row = tris as any;
        setUserStats({
          wins: (row?.tris_wins ?? 0) + (row?.dama_wins ?? 0) + (row?.othello_wins ?? 0),
          losses: (row?.tris_losses ?? 0) + (row?.dama_losses ?? 0) + (row?.othello_losses ?? 0),
          trophies: row?.top_1_trophies ?? 0,
          tournamentsWon: row?.tournaments_won ?? 0,
          badges: computeChampionBadges(champDays),
        });

        // 👤 Profilo: nickname + avatar per la card stile partita
        const { data: profile } = await supabase
          .from("profiles")
          .select("nickname, full_name, avatar_url")
          .eq("id", userId)
          .maybeSingle();
        if (profile) {
          setUserProfile(profile as any);
        }
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
    // 🥇 1° posto: trofeo dorato nel cerchio dorato (sfondo pieno)
    if (position === 0) {
      return (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-full blur-sm opacity-75 animate-pulse" />
          <div className="relative w-10 h-10 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg border-2 border-yellow-300">
            <CampioneIcon className="w-7 h-7 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.35)]" />
          </div>
        </div>
      );
    }

    // 🎖️ 2°-5°: medaglia coesa (nastro integrato + medaglione + numero inciso)
    const tiers: Record<number, "silver" | "bronze" | "sapphire" | "amethyst"> = {
      1: "silver",
      2: "bronze",
      3: "sapphire",
      4: "amethyst",
    };
    const tier = tiers[position];
    if (!tier) return null;
    return (
      <RankMedalIcon
        tier={tier}
        place={position + 1}
        className="w-10 h-10 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]"
      />
    );
  };

  const getRankDisplay = () => {
    if (!userRank) return "—";
    return `${userRank}°`;
  };


  const selectedProfileIndex = selectedProfile
    ? topPlayers.findIndex((p) => p.id === selectedProfile.id)
    : -1;

  return (
    <div className="space-y-4">
      {userId && (
        <Card className="relative overflow-hidden p-5 bg-gradient-to-br from-purple-950/40 via-fuchsia-900/25 to-indigo-950/40 border-pink-500/30 shadow-[0_8px_40px_-12px_rgba(244,114,182,0.35)]">
          {/* glow decorativo */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.16),transparent_55%)]" />

          {/* 🎮 Header: avatar + nickname + ELO + posizione */}
          <div className="relative flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-pink-400 via-fuchsia-500 to-indigo-500 opacity-70 blur-[2px]" />
              <Avatar className="relative w-16 h-16 border-2 border-pink-400/70 shadow-lg shadow-pink-500/30">
                <AvatarImage src={getAvatarUrl(userProfile?.avatar_url ?? null)} />
                <AvatarFallback className="bg-fuchsia-500/20 text-pink-200 font-bold">
                  {(userProfile?.nickname ?? userProfile?.full_name ?? "ME").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg truncate bg-gradient-to-r from-pink-200 via-fuchsia-200 to-indigo-200 bg-clip-text text-transparent">
                {userProfile?.nickname ?? userProfile?.full_name ?? "Tu"}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black uppercase tracking-wide text-pink-300/70 leading-none">ELO</span>
                <span className="text-2xl font-black bg-gradient-to-r from-pink-300 to-fuchsia-300 bg-clip-text text-transparent leading-none">
                  {userElo}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-pink-500/20">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                Posizione
              </span>
              <span className="text-2xl font-black bg-gradient-to-r from-amber-300 via-pink-300 to-fuchsia-300 bg-clip-text text-transparent leading-tight">
                {getRankDisplay()}
              </span>
            </div>
          </div>

          {/* 📊 Stats personali — V/S inline (compatte) + titoli, su una sola strip */}
          {userStats && (
            <div className="relative mt-4 pt-4 border-t border-pink-500/20 flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <VictoryIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xl font-black text-emerald-300 leading-none">{userStats.wins}</span>
                  <span className="text-[11px] font-semibold text-emerald-300/70">Vittorie</span>
                </div>
                <div className="w-px h-5 bg-pink-500/20" />
                <div className="flex items-center gap-1.5">
                  <DefeatIcon className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="text-xl font-black text-rose-300 leading-none">{userStats.losses}</span>
                  <span className="text-[11px] font-semibold text-rose-300/70">Sconfitte</span>
                </div>
              </div>

              {/* 🏅 Titoli (Campione/Settimana/Mese) + Tornei, solo icone + tooltip */}
              <ChampionBadgesRow
                badges={userStats.badges}
                tournamentsWon={userStats.tournamentsWon}
                size="md"
              />
            </div>
          )}
        </Card>
      )}

      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-pink-300" />
            <h4 className="font-black text-lg tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">
              Classifica ELO - TOP 5
            </h4>
          </div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-pink-300" /> : <ChevronDown className="w-5 h-5 text-pink-300" />}
        </button>

        {isOpen && (
          <div className="p-4 pt-0 space-y-3">
            {/* 🦴 Skeleton mentre carica: evita il "pop-in" / salto di altezza */}
            {topPlayers.length === 0 &&
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={`sk-${i}`}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-background/40 animate-pulse"
                >
                  <div className="w-10 h-6 rounded bg-white/10 shrink-0" />
                  <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-24 rounded bg-white/10" />
                    <div className="h-3 w-14 rounded bg-white/10" />
                  </div>
                  <div className="h-5 w-10 rounded bg-white/10 shrink-0" />
                </div>
              ))}
            {topPlayers.map((player, index) => (
              <button
                type="button"
                key={player.id}
                onClick={() => setSelectedProfile(player)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left cursor-pointer ${
                  player.id === userId
                    ? "bg-primary/20 border-2 border-primary hover:bg-primary/30"
                    : "bg-background/50 hover:bg-background/80 hover:scale-[1.01] hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-center w-10 shrink-0">{getTrophyIcon(index)}</div>
                <Avatar className="w-10 h-10 border-2 border-primary/50 shrink-0">
                  <AvatarImage src={getAvatarUrl(player.avatar_url)} />
                  <AvatarFallback>{player.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base truncate">
                    <span className={getRankNicknameClass(index)}>{player.nickname}</span>
                    {player.id === userId && <span className="text-xs text-primary ml-2">(Tu)</span>}
                  </p>
                  <div className="mt-0.5">{renderRankBadge(index, "sm")}</div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">ELO</p>
                  <p className="font-bold text-lg text-primary">{player.elo}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <ProfileStatsDialog
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        topIndex={selectedProfileIndex >= 0 ? selectedProfileIndex : null}
        showRank={true}
        hideWinsLosses
      />
    </div>
  );
};
