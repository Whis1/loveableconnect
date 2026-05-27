import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useTournament, GameType, MatchRow } from "@/hooks/useTournament";
import { useToast } from "@/hooks/use-toast";
import { TournamentSelectionBanner } from "./TournamentSelectionBanner";
import { TournamentOpponentSearch } from "./TournamentOpponentSearch";
import { TournamentBracketView } from "./TournamentBracketView";
import { TournamentEndBanner } from "./TournamentEndBanner";
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
  | "playing";         // l'utente sta giocando il suo match (board attiva)
  // 🚪 NO phase "result": al posto del banner risultato, mostriamo un toast
  //    e usciamo immediatamente alla pagina Sfida.

// 🏆 Orchestratore del torneo. Gestisce tutte le transizioni di stato e
// l'interazione con la board del minigame quando tocca all'utente.
export const TournamentFlow = ({ currentUserId, onExit }: TournamentFlowProps) => {
  const [phase, setPhase] = useState<Phase>("select");
  const [creating, setCreating] = useState(false);
  // Profilo avversario corrente per la board (estratto dal userMatch)
  const opponentProfileRef = useRef<any>(null);
  // 🏆 Dati per il TournamentEndBanner premium (sostituisce il vecchio toast)
  const [endBanner, setEndBanner] = useState<{
    finalPosition: number | null;
    creditsAwarded: number;
    eloDelta: number;
    gameType: "othello" | "dama";
  } | null>(null);

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
  // 🚫 NO RESUME: se troviamo un torneo active in DB al mount, lo abbandoniamo
  //    automaticamente (-20 ELO penalty) e mostriamo la scelta del nuovo gioco.
  //    L'utente NON puo' riprendere un torneo: qualsiasi uscita (reload, navigate,
  //    chiusura tab) = sconfitta automatica + perdita ELO.
  const shouldAbandonExistingRef = useRef(true);
  const abandoningExistingRef = useRef(false);
  // 🚪 Evita double-process del result toast quando il torneo passa a
  //    finished/abandoned (useEffect potrebbe rifire piu' volte).
  const resultProcessedRef = useRef(false);
  // 🆔 ID del torneo creato dall'utente IN QUESTA sessione. Il banner di
  //    risultato (TournamentEndBanner) scatta SOLO se tournament.id corrisponde
  //    a questo ref. Cosi' i tornei "fantasma" di sessioni precedenti non
  //    fanno mai apparire il banner — vengono solo puliti silenziosamente.
  const sessionTournamentIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tournament) {
      // 🛡️ Mantieni shouldAbandonExistingRef=true: il torneo potrebbe ancora
      //    arrivare dalla fetch asincrona di useTournament.
      if (phase !== "select") setPhase("select");
      return;
    }

    // 🆕 PRIMO incontro con un torneo ACTIVE → abbandona automatico (-20 ELO).
    //    🛡️ resultProcessedRef=true SINCRONO: blocca il branch "concluso
    //       sessione corrente" che altrimenti scatterebbe per race condition
    //       quando il realtime channel notifica tournament=abandoned PRIMA
    //       che clearTournament finisca.
    if (
      tournament.status === "active" &&
      shouldAbandonExistingRef.current &&
      !abandoningExistingRef.current
    ) {
      abandoningExistingRef.current = true;
      shouldAbandonExistingRef.current = false;
      resultProcessedRef.current = true;
      (async () => {
        try {
          await abandonTournament("reload_or_reentry");
          await claimRewards(); // idempotente: applica -20 ELO se non gia' claimato
          clearTournament();
        } catch (e) {
          console.warn("Auto-abandon failed:", e);
        }
        setPhase("select");
        abandoningExistingRef.current = false;
      })();
      return;
    }

    // 🆕 PRIMO incontro con torneo FINISHED/ABANDONED → torneo fantasma di
    //    sessione precedente. Pulizia silenziosa, NESSUN toast. claim idempotente
    //    per applicare premi/penalty se non lo erano gia' stati.
    if (
      (tournament.status === "finished" || tournament.status === "abandoned") &&
      shouldAbandonExistingRef.current
    ) {
      shouldAbandonExistingRef.current = false;
      resultProcessedRef.current = true; // 🛡️ blocca branch "concluso"
      (async () => {
        try {
          await claimRewards(); // idempotente
        } catch {}
        clearTournament();
        setPhase("select");
      })();
      return;
    }

    // Da qui in poi, qualsiasi tournament che vediamo NON e' "orfano"
    shouldAbandonExistingRef.current = false;

    // 🆔 Memorizza l'ID del torneo "di sessione" la PRIMA volta che vediamo
    //    un torneo active non-orfano. Sara' usato per filtrare il banner.
    if (tournament.status === "active" && !sessionTournamentIdRef.current) {
      sessionTournamentIdRef.current = tournament.id;
    }

    if (tournament.status === "finished" || tournament.status === "abandoned") {
      // 🏆 Torneo concluso NELLA SESSIONE CORRENTE → mostra il banner SOLO se
      //    l'id del torneo corrisponde a quello che abbiamo creato in questa
      //    sessione. Altrimenti e' un fantasma di sessione precedente: pulizia
      //    silenziosa.
      const isOurSession = tournament.id === sessionTournamentIdRef.current;
      if (!resultProcessedRef.current && isOurSession) {
        resultProcessedRef.current = true;
        (async () => {
          const r = await claimRewards();
          setEndBanner({
            finalPosition: r?.final_position ?? tournament.user_final_position,
            creditsAwarded: r?.credits_awarded ?? 0,
            eloDelta: r?.elo_delta ?? 0,
            gameType: tournament.game_type,
          });
        })();
      } else if (!isOurSession && !resultProcessedRef.current) {
        // Fantasma: claim silenzioso (idempotente) + cleanup
        resultProcessedRef.current = true;
        (async () => {
          try { await claimRewards(); } catch {}
          clearTournament();
          setPhase("select");
        })();
      }
      return;
    }

    // Torneo active appena creato dall'utente → mostra search
    if (phase === "select") {
      setPhase("searching");
      return;
    }
    if (phase === "playing") return;
    if (phase !== "bracket" && phase !== "searching") {
      setPhase("bracket");
    }
  }, [tournament, phase, claimRewards, abandonTournament, clearTournament, onExit, toast]);

  // ============== HANDLER PHASES ==============
  const handleSelectGame = async (gameType: GameType) => {
    // 🛡️ Il prossimo torneo che arrivera' da useTournament e' QUELLO appena
    //    creato dall'utente: NON deve essere auto-abbandonato. Spegniamo il
    //    flag PRIMA di chiamare la RPC. Reset anche resultProcessedRef e
    //    sessionTournamentIdRef cosi' il banner finale del NUOVO torneo
    //    scatti regolarmente per il giusto id.
    shouldAbandonExistingRef.current = false;
    resultProcessedRef.current = false;
    sessionTournamentIdRef.current = null;
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

  // Quando la board chiama onGameEnd → reportUserResult.
  // Se l'utente HA PERSO il match (non finale) → abbandona immediatamente il
  // torneo: niente "continua come spettatore", l'utente viene sbattuto subito
  // alla pagina Sfida con un toast.
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
      setPhase("bracket");
    } else {
      // 🚪 Sconfitta utente: termina IMMEDIATAMENTE il torneo per lui.
      //    Se era la finale (round 3), advance_tournament ha gia' messo
      //    status='finished'. Per quarti/semi il torneo resta 'active' per
      //    gli altri → chiamiamo abandon esplicito cosi' l'utente esce.
      //    L'useEffect rilevera' lo status non-active e mostrera' il toast
      //    finale + onExit.
      await abandonTournament("lost_match");
    }
  };

  const handleAbandon = async () => {
    if (!tournament) {
      onExit();
      return;
    }
    await abandonTournament("voluntary");
    // Il toast finale + onExit() vengono triggerati dall'useEffect quando
    // tournament.status passa ad 'abandoned'.
  };

  // 🏆 Handler chiusura banner risultato (auto-close 5s o click X)
  const handleEndBannerClose = () => {
    setEndBanner(null);
    clearTournament();
    onExit();
  };

  // 🏆 Banner premium overlay: appare SOPRA qualsiasi fase mentre l'utente
  //    sta uscendo dal torneo. Sostituisce il vecchio toast generico.
  const endBannerOverlay = endBanner && (
    <TournamentEndBanner
      open={true}
      finalPosition={endBanner.finalPosition}
      creditsAwarded={endBanner.creditsAwarded}
      eloDelta={endBanner.eloDelta}
      gameType={endBanner.gameType}
      onClose={handleEndBannerClose}
    />
  );

  // ============== RENDER ==============
  // Phase select: nessun torneo attivo, mostra banner di scelta
  if (phase === "select") {
    return (
      <>
        <TournamentSelectionBanner
          onSelect={handleSelectGame}
          onClose={onExit}
          isCreating={creating}
        />
        {endBannerOverlay}
      </>
    );
  }

  // Phase searching: animazione composizione bracket
  if (phase === "searching") {
    if (!tournament || participants.length < 8) {
      return (
        <>
          <Card className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-amber-400" />
            <p>Preparazione torneo...</p>
          </Card>
          {endBannerOverlay}
        </>
      );
    }
    return (
      <>
        <TournamentOpponentSearch
          participants={participants}
          onComplete={handleSearchComplete}
        />
        {endBannerOverlay}
      </>
    );
  }

  // Phase playing: rende la board del minigame
  if (phase === "playing" && tournament && opponentProfileRef.current) {
    if (tournament.game_type === "othello") {
      return (
        <>
          <OthelloBoard
            opponent={opponentProfileRef.current}
            onGameEnd={handleBoardGameEnd}
            tournamentMode
          />
          {endBannerOverlay}
        </>
      );
    }
    return (
      <>
        <CheckersBoard
          opponent={opponentProfileRef.current}
          onGameEnd={handleBoardGameEnd}
          tournamentMode
        />
        {endBannerOverlay}
      </>
    );
  }

  // Phase bracket: overview del torneo
  if (phase === "bracket" && tournament) {
    return (
      <>
        <TournamentBracketView
          tournament={tournament}
          participants={participants}
          matches={matches}
          userMatch={userMatch}
          currentUserId={currentUserId}
          onStartUserMatch={handleStartUserMatch}
          onAbandon={handleAbandon}
        />
        {endBannerOverlay}
      </>
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
