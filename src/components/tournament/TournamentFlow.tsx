import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Handshake } from "lucide-react";
import { useTournament, GameType, MatchRow } from "@/hooks/useTournament";
import { useToast } from "@/hooks/use-toast";
import { TournamentSelectionBanner } from "./TournamentSelectionBanner";
import { TournamentOpponentSearch } from "./TournamentOpponentSearch";
import { TournamentBracketView } from "./TournamentBracketView";
import { TournamentEndBanner } from "./TournamentEndBanner";
import { RockPaperScissors } from "./RockPaperScissors";
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
  // 🎲 Spareggio dopo un pareggio Othello:
  //    - tiebreak="intro": banner che spiega lo spareggio Carta-Forbici-Sasso
  //    - tiebreak="rps": il minigame RPS in corso
  //    - finalReplay=true: pareggio in FINALE → banner "si rigioca" + replay board
  const [tiebreak, setTiebreak] = useState<null | "intro" | "rps">(null);
  const [finalReplay, setFinalReplay] = useState(false);
  // Chiave per forzare il REMOUNT della board (replay finale = partita da capo)
  const [boardKey, setBoardKey] = useState(0);
  // ⏱️ Countdown (10s) mostrato sui banner intro spareggio / replay finale:
  //    a 0 lo spareggio/replay parte DA SOLO (niente pulsante manuale).
  const [tiebreakCountdown, setTiebreakCountdown] = useState<number | null>(null);

  useEffect(() => {
    const active = tiebreak === "intro" || finalReplay;
    if (!active) {
      setTiebreakCountdown(null);
      return;
    }
    let secs = 10;
    setTiebreakCountdown(secs);
    const timer = setInterval(() => {
      secs -= 1;
      if (secs <= 0) {
        clearInterval(timer);
        setTiebreakCountdown(null);
        if (tiebreak === "intro") {
          setTiebreak("rps");
        } else {
          // replay finale: rimonta la board fresca
          setFinalReplay(false);
          setBoardKey((k) => k + 1);
        }
      } else {
        setTiebreakCountdown(secs);
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiebreak, finalReplay]);

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

  // Applica l'esito definitivo del match utente (win/lose) → avanza o abbandona.
  const resolveUserMatch = async (userWon: boolean) => {
    await reportUserResult(userWon);
    if (userWon) {
      toast({ title: "Match vinto!", description: "Passi al round successivo." });
      setPhase("bracket");
    } else {
      // 🚪 Sconfitta utente: termina IMMEDIATAMENTE il torneo per lui.
      await abandonTournament("lost_match");
    }
  };

  // Quando la board chiama onGameEnd.
  //  - win/lose → resolve diretto
  //  - draw (solo Othello) → spareggio:
  //      • match normale (quarti/semi) → Carta-Forbici-Sasso al meglio dei 3
  //      • FINALE → si rigioca la partita da capo finché non c'è un vincitore
  const handleBoardGameEnd = async (result: "win" | "lose" | "draw") => {
    if (!userMatch) return;

    if (result === "draw") {
      if (userMatch.round === 3) {
        // Finale pareggiata → replay
        setFinalReplay(true);
      } else {
        // Quarti/Semi pareggiati → spareggio RPS
        setTiebreak("intro");
      }
      return;
    }

    await resolveUserMatch(result === "win");
  };

  // 🎲 Esito spareggio Carta-Forbici-Sasso
  const handleRpsResult = async (userWon: boolean) => {
    setTiebreak(null);
    await resolveUserMatch(userWon);
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

  // Phase playing: rende la board del minigame (o lo spareggio dopo un pareggio)
  if (phase === "playing" && tournament && opponentProfileRef.current) {
    const opp = opponentProfileRef.current;
    const toAvatarUrl = (path: string | null | undefined): string => {
      if (!path) return "";
      if (path.startsWith("http")) return path;
      return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-images/${path}`;
    };
    const oppAvatar = toAvatarUrl(opp.avatar_url);
    // 👤 Profilo dell'utente preso dai partecipanti del torneo (per avatar+nome reali)
    const userParticipant = participants.find((p) => p.is_user);
    const userAvatar = toAvatarUrl(userParticipant?.profile?.avatar_url);
    const userDisplayName =
      userParticipant?.profile?.nickname ?? userParticipant?.profile?.full_name ?? "Tu";

    // 🤝 Banner intro spareggio (pareggio quarti/semi → Carta-Forbici-Sasso)
    if (tiebreak === "intro") {
      return (
        <Card className="mb-6 p-8 text-center bg-gradient-to-br from-purple-950/50 via-fuchsia-900/30 to-indigo-950/50 border-pink-500/40">
          <Handshake className="w-16 h-16 mx-auto mb-4 text-pink-300" />
          <h3 className="text-2xl font-black bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent mb-2">
            Pareggio!
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            Avete totalizzato lo stesso punteggio. Per decidere chi passa il turno
            vi sfiderete a <strong className="text-pink-300">Carta-Forbici-Sasso</strong>:
            chi arriva per primo a 3 vittorie avanza nel torneo.
          </p>
          <p className="text-xs text-pink-200/80">
            Lo spareggio inizia tra{" "}
            <span className="font-black text-pink-100 text-lg">{tiebreakCountdown ?? 10}</span>{" "}
            secondi…
          </p>
        </Card>
      );
    }

    // 🎲 Minigame Carta-Forbici-Sasso
    if (tiebreak === "rps") {
      return (
        <RockPaperScissors
          userName={userDisplayName}
          userAvatarUrl={userAvatar}
          opponentName={opp.nickname ?? "Sfidante"}
          opponentAvatarUrl={oppAvatar}
          onResult={handleRpsResult}
        />
      );
    }

    // 🔁 Banner replay finale (pareggio in finale → si rigioca da capo)
    if (finalReplay) {
      return (
        <Card className="mb-6 p-8 text-center bg-gradient-to-br from-purple-950/50 via-fuchsia-900/30 to-indigo-950/50 border-pink-500/40">
          <Handshake className="w-16 h-16 mx-auto mb-4 text-pink-300" />
          <h3 className="text-2xl font-black bg-gradient-to-r from-pink-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent mb-2">
            Finale in parità!
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            La finale è finita in pareggio: un campione si decide sul campo.
            Si rigioca la partita da capo, finché uno dei due non vince.
          </p>
          <p className="text-xs text-pink-200/80">
            La finale riparte tra{" "}
            <span className="font-black text-pink-100 text-lg">{tiebreakCountdown ?? 10}</span>{" "}
            secondi…
          </p>
        </Card>
      );
    }

    // Board del gioco. key={boardKey} forza il remount sul replay finale.
    if (tournament.game_type === "othello") {
      return (
        <>
          <OthelloBoard
            key={boardKey}
            opponent={opp}
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
          key={boardKey}
          opponent={opp}
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
