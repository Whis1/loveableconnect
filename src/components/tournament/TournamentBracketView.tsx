import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, X, Gamepad2, Hourglass, CircleCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  MatchRow,
  ParticipantRow,
  TournamentRow,
} from "@/hooks/useTournament";

const AUTO_START_DELAY_MS = 10000;

interface TournamentBracketViewProps {
  tournament: TournamentRow;
  participants: ParticipantRow[];
  matches: MatchRow[];
  userMatch: MatchRow | undefined;
  currentUserId: string;
  onStartUserMatch: () => Promise<void>;
  onAbandon: () => Promise<void>;
}

// 🏆 Bracket 8-player visuale:
//   - 4 match a sinistra (quarti sx + semi sx) e 4 a destra (quarti dx + semi dx)
//   - Finale in mezzo
//   - Per ogni match NPC in_progress: countdown live al scheduled_end_at
//   - Match utente: bottone "Inizia partita" o "Stai giocando..."
export const TournamentBracketView = ({
  tournament,
  participants,
  matches,
  userMatch,
  currentUserId,
  onStartUserMatch,
  onAbandon,
}: TournamentBracketViewProps) => {

  // 🚀 Auto-start del match utente: appena userMatch entra in stato 'waiting'
  //    (cioe' appena la sua partita e' pronta), avviamo un countdown 3s e poi
  //    chiamiamo onStartUserMatch automaticamente. Niente piu' click manuale.
  const [autoStartSecs, setAutoStartSecs] = useState<number | null>(null);
  const autoStartTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userMatch || userMatch.status !== "waiting") {
      setAutoStartSecs(null);
      return;
    }
    // Evita di re-triggerare se gia' partito per questo match
    if (autoStartTriggeredRef.current === userMatch.id) return;
    autoStartTriggeredRef.current = userMatch.id;

    // 🕒 Countdown unico: 10 → 1 → AVVIO. Quando arriva a 0 fa partire la
    //    partita (niente piu' "0 poi torna a 10" visivo). Single timer cosi'
    //    display e trigger sono perfettamente sincronizzati.
    let secs = Math.round(AUTO_START_DELAY_MS / 1000); // 10
    setAutoStartSecs(secs);
    const timer = setInterval(() => {
      secs -= 1;
      if (secs <= 0) {
        clearInterval(timer);
        setAutoStartSecs(null);
        onStartUserMatch().catch((e) => console.error("auto-start failed:", e));
      } else {
        setAutoStartSecs(secs); // mostra 9, 8, …, 1
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userMatch?.id, userMatch?.status]);

  const participantById = new Map(participants.map((p) => [p.profile_id, p]));

  const getAvatarUrl = (profileId: string | null): string => {
    if (!profileId) return "";
    const p = participantById.get(profileId);
    if (!p?.profile) return "";
    if (p.profile.avatar_url) {
      return supabase.storage.from("profile-images").getPublicUrl(p.profile.avatar_url).data.publicUrl;
    }
    if (p.profile.photos && p.profile.photos.length > 0) {
      return supabase.storage.from("profile-images").getPublicUrl(p.profile.photos[0]).data.publicUrl;
    }
    return "";
  };

  const nickname = (profileId: string | null): string => {
    if (!profileId) return "—";
    const p = participantById.get(profileId);
    return p?.profile?.nickname ?? p?.profile?.full_name ?? "Sfidante";
  };

  // Trova match by round + bracket_side + match_index
  const findMatch = (round: number, side: "left" | "right" | "final", idx: number = 1) =>
    matches.find((m) => m.round === round && m.bracket_side === side && m.match_index === idx);

  const isUserInMatch = (m: MatchRow | undefined) =>
    m && (m.player_a_id === currentUserId || m.player_b_id === currentUserId);

  // ============= MATCH CARD =============
  const MatchCard = ({ match, compact = false }: { match: MatchRow | undefined; compact?: boolean }) => {
    if (!match) return <div className="h-20" />;

    const aId = match.player_a_id;
    const bId = match.player_b_id;
    const aWon = match.winner_id && match.winner_id === aId;
    const bWon = match.winner_id && match.winner_id === bId;
    const isUserMatch = isUserInMatch(match);
    const isPending = match.status === "pending";
    const isCompleted = match.status === "completed";
    const isNpcInProgress = !match.is_user_match && match.status === "in_progress";

    const playerRow = (pid: string | null, isWinner: boolean) => (
      <div
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${
          isWinner
            ? "bg-emerald-500/20 border border-emerald-400/40"
            : isCompleted
            ? "bg-rose-500/10 border border-rose-500/20 opacity-60"
            : "bg-muted/30 border border-white/5"
        }`}
      >
        <Avatar className="w-7 h-7 border border-white/10">
          <AvatarImage src={getAvatarUrl(pid)} />
          <AvatarFallback className="text-[10px] bg-muted">?</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold truncate ${isWinner ? "text-emerald-300" : ""}`}>
            {pid === currentUserId ? "Tu" : nickname(pid)}
          </p>
          {!isPending && (
            <p className="text-[9px] text-muted-foreground">
              ELO {participantById.get(pid ?? "")?.elo_snapshot ?? "—"}
            </p>
          )}
        </div>
        {isWinner && <Trophy className="w-3.5 h-3.5 text-fuchsia-300" />}
      </div>
    );

    return (
      <div
        className={`rounded-xl border-2 p-2 space-y-1.5 transition-all ${
          isUserMatch
            ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/30"
            : isCompleted
            ? "border-white/10 bg-muted/20"
            : isNpcInProgress
            ? "border-pink-500/40 bg-pink-500/5"
            : "border-white/10 bg-muted/10 opacity-70"
        } ${compact ? "" : ""}`}
      >
        {playerRow(aId, !!aWon)}
        <div className="text-center text-[10px] font-bold text-muted-foreground">VS</div>
        {playerRow(bId, !!bWon)}

        {/* Status footer — icone lucide, niente emoji base */}
        <div className="text-center text-[10px] pt-1">
          {isPending && (
            <span className="text-muted-foreground">In attesa</span>
          )}
          {(isNpcInProgress || (isUserMatch && !isCompleted)) && (
            <span className="inline-flex items-center gap-1 text-pink-300/80">
              <Hourglass className="w-3 h-3" />
              In corso
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-1 text-emerald-400/70">
              <CircleCheck className="w-3 h-3" />
              Concluso
            </span>
          )}
        </div>
      </div>
    );
  };

  // ============= LAYOUT BRACKET =============
  const quarterLeft1 = findMatch(1, "left", 1);
  const quarterLeft2 = findMatch(1, "left", 2);
  const quarterRight1 = findMatch(1, "right", 1);
  const quarterRight2 = findMatch(1, "right", 2);
  const semiLeft = findMatch(2, "left");
  const semiRight = findMatch(2, "right");
  const finalMatch = findMatch(3, "final");

  const userCanStart = userMatch && userMatch.status === "waiting";

  return (
    <Card className="mb-6 p-5 md:p-8 bg-gradient-to-br from-purple-950/40 via-fuchsia-900/25 to-indigo-950/40 border-pink-500/30 shadow-[0_8px_40px_-12px_rgba(244,114,182,0.35)]">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-black tracking-tight bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent flex items-center gap-2">
            <Trophy className="w-7 h-7 text-pink-300" />
            Torneo {tournament.game_type === "othello" ? "Othello" : "Dama"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Round{" "}
            {tournament.current_round === 1
              ? "Quarti di Finale"
              : tournament.current_round === 2
              ? "Semifinali"
              : "Finale"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAbandon}
          className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-xs"
        >
          <X className="w-4 h-4 mr-1" />
          Abbandona
        </Button>
      </div>

      {/* Bracket grid responsive */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 items-center">
        {/* Colonna 1: Quarti SX */}
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-center font-bold">
            Quarti SX
          </p>
          <MatchCard match={quarterLeft1} />
          <MatchCard match={quarterLeft2} />
        </div>

        {/* Colonna 2: Semi SX */}
        <div className="space-y-4 md:pt-12">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-center font-bold">
            Semi SX
          </p>
          <MatchCard match={semiLeft} />
        </div>

        {/* Colonna 3: Finale */}
        <div className="space-y-4 md:pt-24">
          <p className="text-[10px] uppercase tracking-wide text-pink-300 text-center font-black inline-flex items-center justify-center gap-1 w-full">
            <Trophy className="w-3 h-3" />
            FINALE
          </p>
          <MatchCard match={finalMatch} />
        </div>

        {/* Colonna 4: Semi DX */}
        <div className="space-y-4 md:pt-12">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-center font-bold">
            Semi DX
          </p>
          <MatchCard match={semiRight} />
        </div>

        {/* Colonna 5: Quarti DX */}
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-center font-bold">
            Quarti DX
          </p>
          <MatchCard match={quarterRight1} />
          <MatchCard match={quarterRight2} />
        </div>
      </div>

      {/* 🚀 Auto-start partita utente: countdown automatico, niente click */}
      {userCanStart && (
        <div className="mt-6 flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-cyan-500/15 border-2 border-cyan-400/40 animate-pulse">
          <p className="text-sm font-semibold text-cyan-300 inline-flex items-center gap-1.5">
            <Gamepad2 className="w-4 h-4" />
            Il Torneo sta per iniziare
          </p>
          <p className="text-xs text-cyan-200/80">
            Avvio automatico tra{" "}
            <span className="font-black text-cyan-100 text-lg">
              {autoStartSecs ?? Math.round(AUTO_START_DELAY_MS / 1000)}
            </span>{" "}
            secondi…
          </p>
        </div>
      )}

      {/* Loader rimosso su richiesta utente: il bracket parla da solo. */}
    </Card>
  );
};
