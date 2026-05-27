import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useTournament, GameType, MatchRow } from "@/hooks/useTournament";
import { useToast } from "@/hooks/use-toast";
import { TournamentSelectionBanner } from "./TournamentSelectionBanner";
import { TournamentOpponentSearch } from "./TournamentOpponentSearch";
import { TournamentBracketView } from "./TournamentBracketView";
import { TournamentResultBanner } from "./TournamentResultBanner";
import { OthelloBoard } from "../tris/OthelloBoard";
import { CheckersBoard } from "../tris/CheckersBoard";

interface TournamentFlowProps {
  currentUserId: string;
  /** L'utente ha già pagato il biglietto (1 partita giornaliera o 2 crediti).
   *  Il flusso termina con onExit() che riporta TrisGameBanner allo stato idle. */
  onExit: () => void;
}

type Phase =
  | "select"           // scelta othello/dama
  | "searching"        // animazione composizione bracket
  | "bracket"          // bracket overview, l'utente aspetta o sta per giocare
  | "playing"          // l'utente sta giocando il suo match (board attiva)
  | "result";          // banner risultato finale

// 🏆 Orchestratore del torneo. Gestisce tutte le transizioni di stato e
// l'interazione con la board del minigame quando tocca all'utente.
export const TournamentFlow = ({ currentUserId, onExit }: TournamentFlowProps) => {
  const [phase, setPhase] = useState<Phase>("select");
  const [creating, setCreating] = useState(false);
  // Banner risultato (con dati premio post claim)
  const [resultData, setResultData] = useState<{
    finalPosition: number | null;
    creditsAwarded: number;
    eloDelta: number;
  } | null>(null);
  const [spectating, setSpectating] = useState(false);
  // Profilo avversario corrente per la board (estratto dal userMatch)
  const opponentProfileRef = useRef<any>(null);

  const { toast } = useToast();

  const {
    tournament,
    participants,
    matches,
    userMatch,
    createTournament,
    startUserMatch,
    reportUserResult,
    abandonTournament,
    claimRewards,
    clearTournament,
  } = useTournament(currentUserId);

  // ============== AUTO-TRANSITION ==============
  // Quando il torneo viene caricato/aggiornato, decidiamo dove siamo nel flusso.
  useEffect(() => {
    if (!tournament) {
      // Nessun torneo attivo: torna a select
      if (phase !== "select") setPhase("select");
      return;
    }

    if (tournament.status === "finished" || tournament.status === "abandoned") {
      // Torneo concluso: passa a result (se non gia' fatto)
      if (phase !== "result" && !spectating) {
        // Lancia il claim e poi mostra il banner
        (async () => {
          const r = await claimRewards();
          if (r) {
            setResultData({
              finalPosition: r.final_position,
              creditsAwarded: r.credits_awarded ?? 0,
              eloDelta: r.elo_delta ?? 0,
            });
          } else {
            // Fallback se claim fallisce
            setResultData({
              finalPosition: tournament.user_final_position,
              creditsAwarded: 0,
              eloDelta: 0,
            });
          }
          setPhase("result");
        })();
      }
      return;
    }

    // Torneo active
    if (phase === "select") {
      // Appena creato → mostra animazione
      setPhase("searching");
      return;
    }
    if (phase === "playing") return; // l'utente sta giocando il suo match
    // Default: bracket
    if (phase !== "bracket" && phase !== "searching") {
      setPhase("bracket");
    }
  }, [tournament, phase, spectating, claimRewards]);

  // ============== HANDLER PHASES ==============
  const handleSelectGame = async (gameType: GameType) => {
    setCreating(true);
    try {
      await createTournament(gameType);
      // La transizione a 'searching' avviene tramite useEffect su tournament
    } catch (e: any) {
      toast({
        title: "Errore creazione torneo",
        description: e?.message ?? "Riprova fra qualche istante.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSearchComplete = () => {
    setPhase("bracket");
  };

  const handleStartUserMatch = async () => {
    if (!userMatch) return;
    // Estrai il profilo avversario per la board
    const opponentId =
      userMatch.player_a_id === currentUserId ? userMatch.player_b_id : userMatch.player_a_id;
    const opponentParticipant = participants.find((p) => p.profile_id === opponentId);
    if (!opponentParticipant?.profile) {
      toast({
        title: "Errore",
        description: "Profilo avversario non trovato.",
        variant: "destructive",
      });
      return;
    }
    opponentProfileRef.current = {
      id: opponentParticipant.profile.id,
      nickname: opponentParticipant.profile.nickname ?? opponentParticipant.profile.full_name,
      avatar_url: opponentParticipant.profile.avatar_url,
      game_elo: opponentParticipant.elo_snapshot,
      is_admin_profile: true,
    };
    await startUserMatch();
    setPhase("playing");
  };

  // Quando la board chiama onGameEnd → reportUserResult e torna al bracket
  const handleBoardGameEnd = async (result: "win" | "lose" | "draw") => {
    if (!userMatch) return;
    // Pareggio non ammesso in torneo: Othello forza "lose" in caso di parita',
    // Dama non produce pareggi. Per sicurezza tratto draw come lose.
    const userWon = result === "win";
    await reportUserResult(userWon);
    if (userWon) {
      toast({
        title: "🎯 Match vinto!",
        description: "Passi al round successivo.",
      });
    } else {
      toast({
        title: "💔 Match perso",
        description: "Sei eliminato dal torneo.",
        variant: "destructive",
      });
    }
    setPhase("bracket");
  };

  const handleAbandon = async () => {
    if (!tournament) {
      onExit();
      return;
    }
    await abandonTournament("voluntary");
    // claim + result via useEffect
  };

  const handleResultClose = () => {
    clearTournament();
    setResultData(null);
    setSpectating(false);
    onExit();
  };

  const handleSpectate = () => {
    // L'utente vuole guardare il torneo continuare anche se è eliminato.
    setSpectating(true);
    setResultData(null);
    setPhase("bracket");
  };

  // ============== RENDER ==============
  // Phase select: nessun torneo attivo, mostra banner di scelta
  if (phase === "select") {
    return (
      <TournamentSelectionBanner
        onSelect={handleSelectGame}
        onClose={onExit}
        isCreating={creating}
      />
    );
  }

  // Phase searching: animazione composizione bracket
  if (phase === "searching") {
    if (!tournament || participants.length < 8) {
      return (
        <Card className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-400" />
          <p>Preparazione torneo...</p>
        </Card>
      );
    }
    return (
      <TournamentOpponentSearch
        participants={participants}
        onComplete={handleSearchComplete}
      />
    );
  }

  // Phase playing: rende la board del minigame
  if (phase === "playing" && tournament && opponentProfileRef.current) {
    if (tournament.game_type === "othello") {
      return (
        <OthelloBoard
          opponent={opponentProfileRef.current}
          onGameEnd={handleBoardGameEnd}
          tournamentMode
        />
      );
    }
    return (
      <CheckersBoard
        opponent={opponentProfileRef.current}
        onGameEnd={handleBoardGameEnd}
        tournamentMode
      />
    );
  }

  // Phase bracket: overview del torneo
  if ((phase === "bracket" || spectating) && tournament) {
    return (
      <>
        <TournamentBracketView
          tournament={tournament}
          participants={participants}
          matches={matches}
          userMatch={spectating ? undefined : userMatch}
          currentUserId={currentUserId}
          onStartUserMatch={handleStartUserMatch}
          onAbandon={handleAbandon}
        />

        {/* Banner risultato sovrapposto se phase=='result' ma anche in spectating
            mostriamo il risultato finale quando il torneo è davvero finito.
            Qui non lo mostriamo se siamo in spectating active → solo a torneo
            FINITO. */}
        {resultData && tournament.status !== "active" && (
          <TournamentResultBanner
            open={true}
            finalPosition={resultData.finalPosition}
            creditsAwarded={resultData.creditsAwarded}
            eloDelta={resultData.eloDelta}
            gameType={tournament.game_type}
            allowSpectate={false}
            onClose={handleResultClose}
          />
        )}
      </>
    );
  }

  // Phase result: torneo concluso, banner con premi
  if (phase === "result" && resultData && tournament) {
    // allowSpectate=true SOLO se l'utente è stato eliminato prima della finale
    // E il torneo è ancora "in corso per gli altri" (ovvero ha senso spettare).
    // Per semplicita': se finalPosition >= 3 (eliminato prima della finale)
    // e ci sono ancora match active in altri round, permette spectate.
    // Per ora: spectate disponibile per posizioni 3-8 SEMPRE (può sempre
    // riguardare il bracket).
    const canSpectate = (resultData.finalPosition ?? 0) >= 3;
    return (
      <TournamentResultBanner
        open={true}
        finalPosition={resultData.finalPosition}
        creditsAwarded={resultData.creditsAwarded}
        eloDelta={resultData.eloDelta}
        gameType={tournament.game_type}
        allowSpectate={canSpectate}
        onClose={handleResultClose}
        onContinueAsSpectator={canSpectate ? handleSpectate : undefined}
      />
    );
  }

  // Fallback
  return (
    <Card className="p-8 text-center">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-400" />
      <p>Caricamento torneo...</p>
    </Card>
  );
};
