import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileThemeRing } from "@/components/ProfileThemeRing";
import { getProfileTheme } from "@/lib/profileThemes";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ChevronDown, ChevronUp, Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  computeChampionBadges,
  computeStrictChampionBadges,
  mergeChampionBadges,
  dateStringToDayNumber,
  ChampionBadges,
} from "@/lib/championBadges";
import { ChampionBadgesRow } from "./ChampionBadgesRow";
import { CampioneIcon, RankMedalIcon } from "@/lib/championIcons";
import {
  computeAdminElos,
  computeAdminStats,
  computeLeaderboardRankDurations,
  resolveLeaderboardTies,
} from "@/lib/adminElo";
import { ProfileStatsDialog } from "./ProfileStatsDialog";
import { VictoryIcon, DefeatIcon } from "@/lib/gameIcons";
import { refreshLeaderboardRankStreaks, streakMapByProfileId } from "@/lib/leaderboardStreaks";

interface LeaderboardProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  elo: number;
  is_admin_profile: boolean;
  profile_theme?: string | null;
  debugWins?: number;
  debugLosses?: number;
  rankDurationMs?: number | null;
}

interface EloLeaderboardProps {
  userId?: string;
}

const INTERNAL_ADMIN_EMAIL = "admin@loveableconnect.internal";

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
      label: "Champion",
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
    profile_theme?: string | null;
  } | null>(null);
  // 🏆 Stats personali dell'utente: V/S/trofei/tornei_vinti + titoli campione
  const [userStats, setUserStats] = useState<{
    wins: number;
    losses: number;
    trophies: number;
    tournamentsWon: number;
    badges: ChampionBadges;
    apexUnlocked: boolean;
    zenithUnlocked: boolean;
  } | null>(null);
  // 🆕 Default true: la classifica è APERTA appena si entra. Click sulla
  // tendina per chiuderla.
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<LeaderboardProfile | null>(null);
  const [showAdminRankDebug, setShowAdminRankDebug] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchLeaderboard = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // ⚠️ NON usiamo più award_daily_top1_if_needed: assegnava il "campione del
    //    giorno" al miglior UTENTE REALE ignorando gli ELO admin (simulati solo
    //    lato client). Risultato: titoli sbloccati pur non essendo davvero #1.
    //    Ora è award_my_daily_champion (più sotto) a registrare il campione,
    //    chiamato SOLO quando l'utente è #1 nella classifica COMPLETA (admin inclusi).

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const canSeeAdminRankDebug =
        sessionData.session?.user.email?.trim().toLowerCase() === INTERNAL_ADMIN_EMAIL;
      if (showAdminRankDebug !== canSeeAdminRankDebug) {
        setShowAdminRankDebug(canSeeAdminRankDebug);
      }

      const { data: admins } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, game_elo, profile_theme")
        .eq("is_admin_profile", true);

      const { data: realUsers } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, game_elo, profile_theme")
        .eq("is_admin_profile", false)
        .order("game_elo", { ascending: false })
        .limit(10);

      const adminElos = computeAdminElos(admins ?? []);

      // ELO "grezzo" di ognuno: admin = simulato (già deduellato fra loro),
      // utente reale = game_elo vero dal DB.
      const rawEntries: LeaderboardProfile[] = [
        ...(admins ?? []).map((p) => ({
          id: p.id,
          nickname: p.nickname,
          avatar_url: p.avatar_url,
          elo: adminElos.get(p.id) ?? 1200,
          is_admin_profile: true,
          profile_theme: (p as any).profile_theme ?? null,
        })),
        ...(realUsers ?? []).map((p) => ({
          id: p.id,
          nickname: p.nickname,
          avatar_url: p.avatar_url,
          elo: p.game_elo ?? 1200,
          is_admin_profile: false,
          profile_theme: (p as any).profile_theme ?? null,
        })),
      ];

      // 🥊 Duello di parità sulla classifica FUSA: se un admin si ritrova con
      //    lo stesso ELO del profilo sopra (admin O utente reale), "gioca" e
      //    scende sotto. Gli utenti reali non vengono mai alterati.
      const resolved = resolveLeaderboardTies(
        rawEntries.map((e) => ({ id: e.id, elo: e.elo, isAdmin: e.is_admin_profile }))
      );
      const entries: LeaderboardProfile[] = rawEntries
        .map((e) => ({ ...e, elo: resolved.get(e.id) ?? e.elo }))
        .sort((a, b) => b.elo - a.elo);

      const streakRows = await refreshLeaderboardRankStreaks();
      const streakById = streakMapByProfileId(streakRows);

      let topFive = entries.slice(0, 5);

      if (canSeeAdminRankDebug) {
        const topIds = topFive.map((player) => player.id);
        const rankDurations = computeLeaderboardRankDurations(
          rawEntries.map((entry) => ({
            id: entry.id,
            elo: entry.elo,
            isAdmin: entry.is_admin_profile,
          })),
          topIds
        );
        const statsById = new Map<string, { wins: number; losses: number }>();
        const adminSeeds = (admins ?? []).map((admin) => ({ id: admin.id }));

        for (const player of topFive) {
          if (player.is_admin_profile) {
            const stats = computeAdminStats(player.id, adminSeeds);
            statsById.set(player.id, {
              wins: stats.totalWins,
              losses: stats.totalLosses,
            });
          }
        }

        const realTopIds = topFive.filter((player) => !player.is_admin_profile).map((player) => player.id);
        if (realTopIds.length > 0) {
          const { data: realStatsRows } = await supabase
            .from("tris_games")
            .select("user_id, tris_wins, tris_losses, dama_wins, dama_losses, othello_wins, othello_losses")
            .in("user_id", realTopIds);

          for (const row of realStatsRows ?? []) {
            statsById.set(row.user_id, {
              wins: (row.tris_wins ?? 0) + (row.dama_wins ?? 0) + (row.othello_wins ?? 0),
              losses: (row.tris_losses ?? 0) + (row.dama_losses ?? 0) + (row.othello_losses ?? 0),
            });
          }
        }

        topFive = topFive.map((player) => {
          const stats = statsById.get(player.id);
          const dbStreak = streakById.get(player.id);
          return {
            ...player,
            debugWins: stats?.wins ?? 0,
            debugLosses: stats?.losses ?? 0,
            rankDurationMs: dbStreak?.rank_started_at
              ? Math.max(0, Date.now() - new Date(dbStreak.rank_started_at).getTime())
              : rankDurations.get(player.id) ?? null,
          };
        });
      }

      setTopPlayers(topFive);

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

        // 🏆 myRank coerente con la classifica MOSTRATA (ELO già deduellati):
        //    conta gli ADMIN il cui ELO risolto è > del mio, più gli UTENTI
        //    reali (oltre i 10 caricati) con game_elo > del mio.
        let higher = 0;
        for (const e of entries) {
          if (e.is_admin_profile && e.elo > (myElo as number)) higher++;
        }
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_admin_profile", false)
          .neq("id", userId)
          .gt("game_elo", myElo);
        const myRank = higher + (count ?? 0) + 1;
        setUserRank(myRank);

        // 🏆 Titoli: si ottengono SOLO se sei #1 nella classifica COMPLETA
        //    (admin INCLUSI — myRank tiene già conto degli ELO admin simulati).
        //    Gli ELO admin esistono solo lato client, quindi è qui che va deciso
        //    il "campione del giorno": award_my_daily_champion registra l'utente
        //    come campione di oggi (→ Weekly/Monthly) e sblocca Champion.
        if (myRank === 1) {
          try {
            await supabase.rpc("award_my_daily_champion" as any);
          } catch (e) {
            console.warn("award_my_daily_champion non disponibile (migration da applicare?):", e);
          }
        }

        // 🏆 Carica vittorie/sconfitte/trofei/tornei_vinti dell'utente da tris_games
        const { data: tris } = await supabase
          .from("tris_games")
          .select("*")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // 🏅 Weekly/Monthly: giorni consecutivi da #1 (daily_top1_trophies)
        const { data: champRows } = await supabase
          .from("daily_top1_trophies")
          .select("award_date")
          .eq("user_id", userId);
        const champDays = (champRows ?? []).map((r: any) => dateStringToDayNumber(r.award_date));

        const row = tris as any;
        const historicalBadges = computeChampionBadges(champDays);
        const storedBadges = {
          everChampion: !!row?.ever_champion,
          weeks: Math.max(0, Number(row?.weekly_champion_titles ?? 0)),
          months: Math.max(0, Number(row?.monthly_champion_titles ?? 0)),
        };
        const maxEloReached = Math.max(myElo as number, Number(row?.max_elo_reached ?? 0));
        const apexUnlocked = !!row?.apex_unlocked || maxEloReached >= 2500;
        const zenithUnlocked = !!row?.zenith_unlocked || maxEloReached >= 3000;
        const streak = streakById.get(userId);
        const currentStreakBadges = streak
          ? computeStrictChampionBadges(
              streak.current_rank === 1 ? streak.top1_streak_started_at : null,
              historicalBadges.everChampion || storedBadges.everChampion || myRank === 1
            )
          : { everChampion: historicalBadges.everChampion || storedBadges.everChampion || myRank === 1, weeks: 0, months: 0 };
        const badges = mergeChampionBadges(storedBadges, historicalBadges, currentStreakBadges);
        // I titoli gia' ottenuti restano permanenti. La streak corrente puo'
        // solo aggiungere un nuovo Weekly/Monthly, mai spegnerne uno storico.
        badges.everChampion = badges.everChampion || storedBadges.everChampion || myRank === 1;
        setUserStats({
          wins: (row?.tris_wins ?? 0) + (row?.dama_wins ?? 0) + (row?.othello_wins ?? 0),
          losses: (row?.tris_losses ?? 0) + (row?.dama_losses ?? 0) + (row?.othello_losses ?? 0),
          trophies: row?.top_1_trophies ?? 0,
          tournamentsWon: row?.tournaments_won ?? 0,
          badges,
          apexUnlocked,
          zenithUnlocked,
        });

        // 👤 Profilo: nickname + avatar per la card stile partita
        const { data: profile } = await supabase
          .from("profiles")
          .select("nickname, full_name, avatar_url, profile_theme")
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
    // 🥇 1° posto: solo il trofeo dorato (niente cerchio), coerente con le medaglie
    if (position === 0) {
      return <CampioneIcon className="w-10 h-10 drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]" />;
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


  const formatRankDuration = (durationMs?: number | null) => {
    if (!durationMs || durationMs < 60 * 1000) return "meno di 1 min";

    const unit = (value: number, singular: string, plural: string) =>
      `${value} ${value === 1 ? singular : plural}`;

    const totalMinutes = Math.floor(durationMs / (60 * 1000));
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const totalWeeks = Math.floor(totalDays / 7);
    const totalMonths = Math.floor(totalDays / 30);

    if (totalMonths > 0) {
      const weeks = Math.floor((totalDays % 30) / 7);
      return weeks > 0
        ? `${unit(totalMonths, "mese", "mesi")} ${unit(weeks, "settimana", "settimane")}`
        : unit(totalMonths, "mese", "mesi");
    }
    if (totalWeeks > 0) {
      const days = totalDays % 7;
      return days > 0
        ? `${unit(totalWeeks, "settimana", "settimane")} ${unit(days, "giorno", "giorni")}`
        : unit(totalWeeks, "settimana", "settimane");
    }
    if (totalDays > 0) {
      const hours = totalHours % 24;
      return hours > 0
        ? `${unit(totalDays, "giorno", "giorni")} ${unit(hours, "ora", "ore")}`
        : unit(totalDays, "giorno", "giorni");
    }
    if (totalHours > 0) {
      const minutes = totalMinutes % 60;
      return minutes > 0
        ? `${unit(totalHours, "ora", "ore")} ${unit(minutes, "min", "min")}`
        : unit(totalHours, "ora", "ore");
    }
    return `${totalMinutes} min`;
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
          <div className="relative flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              {/* Alone rosa solo se NON c'e' un tema (col tema si vede solo l'oro) */}
              {!getProfileTheme(userProfile?.profile_theme).avatarClass && (
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-pink-400 via-fuchsia-500 to-indigo-500 opacity-70 blur-[2px]" />
              )}
              <ProfileThemeRing themeId={userProfile?.profile_theme} className="relative">
                <Avatar className={`relative w-16 h-16 border-2 ${getProfileTheme(userProfile?.profile_theme).avatarClass ? "border-transparent shadow-none" : "border-pink-400/70 shadow-lg shadow-pink-500/30"}`}>
                  <AvatarImage src={getAvatarUrl(userProfile?.avatar_url ?? null)} />
                  <AvatarFallback className="bg-fuchsia-500/20 text-pink-200 font-bold">
                    {(userProfile?.nickname ?? userProfile?.full_name ?? "ME").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </ProfileThemeRing>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-black text-lg truncate ${getProfileTheme(userProfile?.profile_theme).nameClass || "bg-gradient-to-r from-pink-200 via-fuchsia-200 to-indigo-200 bg-clip-text text-transparent"}`}>
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

          {/* 📊 Stats personali — V/S su una riga, titoli/obiettivi sotto */}
          {userStats && (
            <div className="relative mt-4 pt-4 border-t border-pink-500/20 space-y-3">
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

              {/* 🏅 Titoli (Champion/Weekly/Monthly/Tournament) + 🎯 obiettivi (vittorie/ELO) */}
              <ChampionBadgesRow
                badges={userStats.badges}
                tournamentsWon={userStats.tournamentsWon}
                wins={userStats.wins}
                elo={userElo}
                apexUnlocked={userStats.apexUnlocked}
                zenithUnlocked={userStats.zenithUnlocked}
                isCurrentlyFirst={userRank === 1}
                layout="inline"
                size="md"
                className="flex-wrap"
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
                <ProfileThemeRing themeId={player.profile_theme} className="shrink-0">
                  <Avatar className="w-10 h-10 border-2 border-primary/50 shrink-0">
                    <AvatarImage src={getAvatarUrl(player.avatar_url)} />
                    <AvatarFallback>{player.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </ProfileThemeRing>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base truncate">
                    <span className={getProfileTheme(player.profile_theme).nameClass || getRankNicknameClass(index)}>{player.nickname}</span>
                    {player.id === userId && <span className="text-xs text-primary ml-2">(Tu)</span>}
                  </p>
                  <div className="mt-0.5">{renderRankBadge(index, "sm")}</div>
                  {showAdminRankDebug && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold text-pink-100/70">
                      <span>V {player.debugWins ?? 0}</span>
                      <span>S {player.debugLosses ?? 0}</span>
                      <span>In posizione da {formatRankDuration(player.rankDurationMs)}</span>
                    </div>
                  )}
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
