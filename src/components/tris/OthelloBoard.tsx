import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { GameResultOverlay } from "./GameResultOverlay";
import { ProfileStatsDialog } from "./ProfileStatsDialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Wrench } from "lucide-react";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  game_elo?: number;
  is_admin_profile?: boolean;
}

interface OthelloBoardProps {
  opponent: Profile;
  onGameEnd: (result: "win" | "lose" | "draw") => void;
  /** 🏆 Modalità torneo: skip update_game_elo + increment_game_stat (gestiti
   *  da claim_tournament_rewards alla fine del torneo). In caso di pareggio
   *  per conteggio pezzi, il vincitore viene forzato (bot in caso di parita'). */
  tournamentMode?: boolean;
}

type Cell = "black" | "white" | null;
type Board = Cell[];

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
  "🤪", "😜", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "😏", "😒", "🙄", "😬", "🤥",
  "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥",
  "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬",
  "😈", "👿", "💀", "☠️", "🤡", "👹", "👺", "👻", "👽", "🤖",
  "🥴", "😵", "🤯", "🥶", "🥵", "🤢", "🤮", "🤧", "😷", "🤒", "🤕",
  "🤠", "🥳", "🥸", "😎", "🤓", "🧐",
  "👋", "🤚", "✋", "👌", "✌️", "🤞", "🤟", "🤘", "🤙",
  "👍", "👎", "✊", "👊", "👏", "🙌", "👐", "🤝", "🙏",
  "🎉", "🎊", "🎈", "🎁", "✨", "🎯", "🏆", "🥇", "🥈", "🥉", "🏅",
  "💪", "👀",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💕", "💞", "💓", "💗", "💖", "💘",
  "🔥", "💥", "💫", "⭐", "🌟", "⚡", "💢",
  "💯", "🆚", "🔝", "⚔️", "🛡️",
];

// 🎯 Logica Othello: dato il colore di chi muove e la posizione, ritorna
// l'array di indici di pezzi avversari che verrebbero "chiusi/ribaltati"
// in tutte le 8 direzioni se piazzassi un pezzo qui.
const DIRS: Array<[number, number]> = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

function getFlipsForMove(board: Board, idx: number, color: "black" | "white"): number[] {
  if (board[idx] !== null) return [];
  const opposite = color === "black" ? "white" : "black";
  const row = Math.floor(idx / 8);
  const col = idx % 8;
  const allFlips: number[] = [];

  for (const [dr, dc] of DIRS) {
    const candidates: number[] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const i = r * 8 + c;
      if (board[i] === opposite) {
        candidates.push(i);
      } else if (board[i] === color && candidates.length > 0) {
        allFlips.push(...candidates);
        break;
      } else {
        break;
      }
      r += dr;
      c += dc;
    }
  }
  return allFlips;
}

function getAllValidMoves(board: Board, color: "black" | "white"): Array<{ idx: number; flips: number[] }> {
  const moves: Array<{ idx: number; flips: number[] }> = [];
  for (let i = 0; i < 64; i++) {
    if (board[i] !== null) continue;
    const flips = getFlipsForMove(board, i, color);
    if (flips.length > 0) moves.push({ idx: i, flips });
  }
  return moves;
}

// 🎰 Score posizionale Othello: angoli alti (mai più ribaltabili), X-square
// (vicini agli angoli) pericolosi, base = numero pezzi ribaltati.
const POSITIONAL_WEIGHTS: number[] = (() => {
  const w = Array(64).fill(0);
  // Angoli (4): +100
  [0, 7, 56, 63].forEach((i) => (w[i] = 100));
  // X-square (vicino agli angoli, da evitare): -20
  [9, 14, 49, 54].forEach((i) => (w[i] = -20));
  // C-square (adiacenti agli angoli sui bordi): -10
  [1, 6, 8, 15, 48, 55, 57, 62].forEach((i) => (w[i] = -10));
  // Bordi non-C: +5
  for (let i = 2; i <= 5; i++) w[i] = 5;
  for (let i = 58; i <= 61; i++) w[i] = 5;
  for (let i = 16; i <= 40; i += 8) w[i] = 5;
  for (let i = 23; i <= 47; i += 8) w[i] = 5;
  return w;
})();

function evaluateMove(board: Board, idx: number, flips: number[]): number {
  return flips.length + POSITIONAL_WEIGHTS[idx];
}

export const OthelloBoard = ({ opponent, onGameEnd, tournamentMode = false }: OthelloBoardProps) => {
  const [board, setBoard] = useState<Board>(Array(64).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true); // black inizia (player)
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"player" | "bot" | "draw" | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [userEmoji, setUserEmoji] = useState<string | null>(null);
  const [opponentEmoji, setOpponentEmoji] = useState<string | null>(null);
  const [clickedProfile, setClickedProfile] = useState<Profile | null>(null);
  const [lastOpponentEmoji, setLastOpponentEmoji] = useState<string | null>(null);
  const [userElo, setUserElo] = useState<number>(1200);
  const [opponentElo, setOpponentElo] = useState<number>(1200);
  const [timeLeft, setTimeLeft] = useState<number>(40);
  const [hoverFlips, setHoverFlips] = useState<number[]>([]);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [lastEloChange, setLastEloChange] = useState(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const gameCompletedRef = useRef(false);
  const leaveIntentRef = useRef<"reload" | "back" | null>(null);

  // Player = BLACK, Bot = WHITE (standard Othello: black inizia)
  const PLAYER: "black" = "black";
  const BOT: "white" = "white";

  // 🛡️ Ref anti-double-call: il bottone "Continua" dell'overlay E il timer
  //    di auto-close possono scattare entrambi. Usiamo un ref per assicurarci
  //    che onGameEnd venga chiamato UNA volta sola.
  const resultClosedRef = useRef(false);

  // Chiude l'overlay e notifica al parent (TrisGameBanner) che la partita
  // e' finita, in modo che torni allo state idle (pagina Sfida).
  const dismissResultAndReturn = () => {
    if (resultClosedRef.current) return;
    resultClosedRef.current = true;
    setShowResultOverlay(false);
    onGameEnd(winner === "player" ? "win" : winner === "bot" ? "lose" : "draw");
  };

  // 🔧 ADMIN TEST: forza vittoria istantanea per testare il flusso post-game.
  const isAdmin = useIsAdmin();
  const forceAdminWin = () => {
    if (gameCompletedRef.current) return;
    gameCompletedRef.current = true;
    setGameOver(true);
    setWinner("player");
    if (!tournamentMode) {
      updateUserElo(20);
      recordWinStat();
    }
    setLastEloChange(tournamentMode ? 0 : 20);
    setShowResultOverlay(true);
  };

  // 🔧 ADMIN TEST: forza sconfitta istantanea per testare il flusso post-loss.
  const forceAdminLose = () => {
    if (gameCompletedRef.current) return;
    gameCompletedRef.current = true;
    setGameOver(true);
    setWinner("bot");
    if (!tournamentMode) {
      updateUserElo(-10);
      recordLossStat();
    }
    setLastEloChange(tournamentMode ? 0 : -10);
    setShowResultOverlay(true);
  };

  // Auto-close partita: 3.5s normale, 1.2s in torneo (cosi' appare subito il
  // TournamentEndBanner viola senza far vedere prima l'overlay grigio).
  useEffect(() => {
    if (!showResultOverlay || !winner) return;
    const t = setTimeout(dismissResultAndReturn, tournamentMode ? 1200 : 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResultOverlay, winner]);

  useEffect(() => {
    initializeBoard();
    fetchCurrentUserProfile();
    startBotEmojiSystem();
    setOpponentElo(opponent.game_elo || 1200);

    // Realtime ELO updates
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        channel = supabase
          .channel("othello-elo-updates")
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${session.user.id}`,
            },
            (payload: any) => {
              if (payload.new.game_elo !== undefined) setUserElo(payload.new.game_elo);
            }
          )
          .subscribe();
      }
    });

    try {
      localStorage.setItem("othello_game_active", "1");
    } catch {}

    // Pending penalty (se riavvio post-abbandono)
    (async () => {
      try {
        if (localStorage.getItem("othello_pending_penalty") === "1") {
          localStorage.removeItem("othello_pending_penalty");
          await updateUserElo(-10);
          await recordLossStat();
        }
      } catch (e) {
        console.error("Failed applying pending Othello penalty:", e);
      }
    })();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameCompletedRef.current) return;
      const isReloadKey = e.key === "F5" || ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R"));
      if (isReloadKey) {
        e.preventDefault();
        leaveIntentRef.current = "reload";
        setShowLeaveConfirm(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    const handleBeforeUnload = () => {
      if (!gameCompletedRef.current) {
        try {
          localStorage.setItem("othello_pending_penalty", "1");
        } catch {}
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("keydown", handleKeyDown);
      try {
        localStorage.removeItem("othello_game_active");
      } catch {}
      if (!gameCompletedRef.current) {
        updateUserElo(-10);
        recordLossStat();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeBoard = () => {
    const newBoard: Board = Array(64).fill(null);
    // 4 pezzi centrali in configurazione standard Othello
    newBoard[27] = "white"; // (3,3)
    newBoard[28] = "black"; // (3,4)
    newBoard[35] = "black"; // (4,3)
    newBoard[36] = "white"; // (4,4)
    setBoard(newBoard);
  };

  const startBotEmojiSystem = () => {
    // 🎭 Personalità admin: 50% usa emoji, 50% no (silenzioso). Hash
    // deterministico dell'id: lo stesso admin ha sempre lo stesso stile.
    const usesEmojis = parseInt((opponent.id || "0").replace(/[^0-9a-f]/gi, "").slice(0, 6) || "0", 16) % 2 === 0;
    if (!usesEmojis) return;

    const showRandomEmoji = () => {
      // 40% chance ogni 30-50 secondi (meno spam, più naturale)
      if (Math.random() < 0.4 && !gameOver) {
        const availableEmojis = EMOJIS.filter((e) => e !== lastOpponentEmoji);
        const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        setOpponentEmoji(randomEmoji);
        setLastOpponentEmoji(randomEmoji);
        setTimeout(() => setOpponentEmoji(null), 4000);
      }
      if (!gameOver) {
        setTimeout(showRandomEmoji, Math.random() * 20000 + 30000);
      }
    };
    // Prima emoji random tra 15 e 35 secondi
    setTimeout(showRandomEmoji, Math.random() * 20000 + 15000);
  };

  const fetchCurrentUserProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url, game_elo")
      .eq("id", session.user.id)
      .single();
    if (data) {
      setCurrentUserProfile(data);
      setUserElo(data.game_elo || 1200);
    }
  };

  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) return "";
    if (avatarPath.startsWith("http")) return avatarPath;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/profile-images/${avatarPath}`;
  };

  const updateUserElo = async (eloChange: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await supabase.rpc("update_game_elo", {
        user_id: session.user.id,
        elo_change: eloChange,
      });
      setUserElo((prev) => Math.max(0, prev + eloChange));
    } catch (error) {
      console.error("Error updating ELO:", error);
    }
  };

  const recordWinStat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.rpc("increment_game_stat" as any, {
        p_user_id: session.user.id,
        p_game: "othello",
        p_result: "win",
      });
    } catch (e) {
      // Se la RPC non supporta "othello" ancora, fallback su "dama"
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.rpc("increment_game_stat" as any, {
            p_user_id: session.user.id,
            p_game: "dama",
            p_result: "win",
          });
        }
      } catch {}
      console.warn("recordWinStat (othello) non bloccante:", e);
    }
  };

  const recordLossStat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.rpc("increment_game_stat" as any, {
        p_user_id: session.user.id,
        p_game: "othello",
        p_result: "lose",
      });
    } catch (e) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.rpc("increment_game_stat" as any, {
            p_user_id: session.user.id,
            p_game: "dama",
            p_result: "lose",
          });
        }
      } catch {}
      console.warn("recordLossStat (othello) non bloccante:", e);
    }
  };

  // ============ MOVE LOGIC ============

  const applyMove = (currentBoard: Board, idx: number, color: "black" | "white", flips: number[]): Board => {
    const next = [...currentBoard];
    next[idx] = color;
    flips.forEach((i) => (next[i] = color));
    return next;
  };

  const countPieces = (b: Board) => {
    let black = 0, white = 0;
    b.forEach((c) => {
      if (c === "black") black++;
      else if (c === "white") white++;
    });
    return { black, white };
  };

  const endGameIfFinished = (b: Board) => {
    const playerMoves = getAllValidMoves(b, PLAYER);
    const botMoves = getAllValidMoves(b, BOT);
    if (playerMoves.length === 0 && botMoves.length === 0) {
      // Partita finita
      const { black, white } = countPieces(b);
      gameCompletedRef.current = true;
      setGameOver(true);
      if (black > white) {
        setWinner("player");
        if (!tournamentMode) {
          updateUserElo(20);
          recordWinStat();
        }
        setLastEloChange(tournamentMode ? 0 : 20);
      } else if (white > black) {
        setWinner("bot");
        if (!tournamentMode) {
          updateUserElo(-10);
          recordLossStat();
        }
        setLastEloChange(tournamentMode ? 0 : -10);
      } else {
        // Pareggio per conteggio pezzi.
        // - In modalità normale: 'draw' (no ELO change)
        // - In torneo: il pareggio non è ammesso, il bot vince (sfida torneo).
        if (tournamentMode) {
          setWinner("bot");
          setLastEloChange(0);
        } else {
          setWinner("draw");
          setLastEloChange(0);
        }
      }
      setShowResultOverlay(true);
      return true;
    }
    return false;
  };

  const handleSquareClick = (idx: number) => {
    if (!isPlayerTurn || gameOver) return;
    const flips = getFlipsForMove(board, idx, PLAYER);
    if (flips.length === 0) return;
    const next = applyMove(board, idx, PLAYER, flips);
    setBoard(next);
    setHoverFlips([]);
    if (endGameIfFinished(next)) return;
    // Se il bot non ha mosse legali, salta il turno (resta player)
    const botMoves = getAllValidMoves(next, BOT);
    if (botMoves.length === 0) {
      // Salta turno bot
      return;
    }
    setIsPlayerTurn(false);
  };

  const makeBotMove = () => {
    const moves = getAllValidMoves(board, BOT);
    if (moves.length === 0) {
      // Salta turno bot
      const playerMoves = getAllValidMoves(board, PLAYER);
      if (playerMoves.length === 0) {
        endGameIfFinished(board);
        return;
      }
      setIsPlayerTurn(true);
      return;
    }

    // Skill in base a ELO avversario (0..1)
    // ELO 800 = 0 (mosse casuali), ELO 2800 = 1 (sempre best)
    const skill = Math.max(0, Math.min(1, (opponentElo - 800) / 2000));
    // Score ogni mossa
    const scored = moves.map((m) => ({
      ...m,
      score: evaluateMove(board, m.idx, m.flips),
    }));
    scored.sort((a, b) => b.score - a.score);

    let chosen;
    if (Math.random() < skill) {
      // Top mossa
      chosen = scored[0];
    } else {
      // Mossa random tra le legali
      chosen = scored[Math.floor(Math.random() * scored.length)];
    }

    const next = applyMove(board, chosen.idx, BOT, chosen.flips);
    setBoard(next);
    if (endGameIfFinished(next)) return;
    // Se il player non ha mosse legali, salta turno (resta bot)
    const playerMoves = getAllValidMoves(next, PLAYER);
    if (playerMoves.length === 0) {
      // Skip player → ripeti turno bot
      setTimeout(() => makeBotMove(), Math.random() * 2000 + 2000);
      return;
    }
    setIsPlayerTurn(true);
  };

  // Trigger bot move quando isPlayerTurn=false
  useEffect(() => {
    if (!isPlayerTurn && !gameOver) {
      const boardHasPieces = board.some((c) => c !== null);
      if (!boardHasPieces) return;
      // 4-8 secondi (come Dama)
      const delay = Math.random() * 4000 + 4000;
      const timeout = setTimeout(() => makeBotMove(), delay);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurn, gameOver, board]);

  // Timer countdown
  useEffect(() => {
    if (gameOver) return;
    setTimeLeft(40);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (isPlayerTurn) {
            if (!gameCompletedRef.current) {
              gameCompletedRef.current = true;
              setGameOver(true);
              setWinner("bot");
              updateUserElo(-10);
              recordLossStat();
              setLastEloChange(-10);
              setShowResultOverlay(true);
            }
          } else {
            setIsPlayerTurn(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurn, gameOver]);

  const handleEmojiClick = (emoji: string) => {
    setUserEmoji(emoji);
    setShowEmoji(false);
    setTimeout(() => setUserEmoji(null), 4000);
  };

  const { black, white } = countPieces(board);
  const validPlayerMoves = !gameOver && isPlayerTurn ? getAllValidMoves(board, PLAYER).map((m) => m.idx) : [];

  return (
    <Card className="mb-6 p-4 md:p-6 bg-gradient-to-br from-emerald-50 via-emerald-100 to-green-50 dark:from-emerald-950/40 dark:via-green-950/30 dark:to-emerald-950/40 border-emerald-500/40 relative">
      {/* 🔧 ADMIN: pulsanti test "Vinci ora" / "Perdi ora" — visibili solo a
          user_roles.role='admin'. Forzano l'esito per testare flussi post-game. */}
      {isAdmin && !gameOver && (
        <div className="absolute top-2 right-2 z-30 flex flex-col gap-1">
          <button
            onClick={forceAdminWin}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/90 hover:bg-orange-500 text-white text-[10px] font-bold shadow-lg border border-orange-300"
            title="DEBUG: forza vittoria utente (visibile solo admin)"
          >
            <Wrench className="w-3 h-3" />
            [ADMIN] Vinci ora
          </button>
          <button
            onClick={forceAdminLose}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-700/90 hover:bg-slate-700 text-white text-[10px] font-bold shadow-lg border border-slate-500"
            title="DEBUG: forza sconfitta utente (visibile solo admin)"
          >
            <Wrench className="w-3 h-3" />
            [ADMIN] Perdi ora
          </button>
        </div>
      )}
      {/* Header con avatar (player sx, opponent dx) */}
      <div className="flex items-center justify-between mb-4">
        {/* Player (sx) */}
        <div className="flex items-center space-x-3 relative">
          <button
            type="button"
            onClick={() => currentUserProfile && setClickedProfile(currentUserProfile)}
            className="relative cursor-pointer hover:scale-110 transition-transform"
            title="Vedi le tue statistiche"
          >
            <Avatar className="w-14 h-14 border-2 border-gray-900 dark:border-gray-100">
              <AvatarImage src={getAvatarUrl(currentUserProfile?.avatar_url || null)} />
              <AvatarFallback>
                {currentUserProfile?.nickname?.slice(0, 2).toUpperCase() || "ME"}
              </AvatarFallback>
            </Avatar>
            {userEmoji && (
              <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-3xl animate-bounce">
                {userEmoji}
              </div>
            )}
          </button>
          <div>
            <p className="font-bold">{currentUserProfile?.nickname || "Tu"}</p>
            <p className="text-xs text-muted-foreground">⚫ Nero · {black}</p>
            <p className="text-xs font-semibold text-primary">ELO: {userElo}</p>
          </div>
        </div>

        {/* Timer & emoji button */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={cn(
              "text-2xl font-black",
              timeLeft <= 10 ? "text-destructive animate-pulse" : "text-foreground"
            )}
          >
            {timeLeft}s
          </div>
          {/* 😊 Emoji button nascosto in modalità torneo (richiesta utente) */}
          {!tournamentMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmoji(!showEmoji)}
              className="shrink-0"
            >
              😊
            </Button>
          )}
        </div>

        {/* Opponent (dx) */}
        <div className="flex items-center space-x-3 relative">
          <div>
            <p className="font-bold text-right">{opponent.nickname}</p>
            <p className="text-xs text-muted-foreground text-right">⚪ Bianco · {white}</p>
            <p className="text-xs font-semibold text-destructive text-right">ELO: {opponentElo}</p>
          </div>
          <button
            type="button"
            onClick={() => setClickedProfile({ ...opponent, is_admin_profile: opponent.is_admin_profile ?? true })}
            className="relative cursor-pointer hover:scale-110 transition-transform"
            title={`Vedi statistiche di ${opponent.nickname}`}
          >
            <Avatar className="w-14 h-14 border-2 border-destructive">
              <AvatarImage src={getAvatarUrl(opponent.avatar_url)} />
              <AvatarFallback>{opponent.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            {opponentEmoji && (
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-3xl animate-bounce">
                {opponentEmoji}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Stats dialog */}
      <ProfileStatsDialog
        profile={
          clickedProfile
            ? {
                id: clickedProfile.id,
                nickname: clickedProfile.nickname,
                avatar_url: clickedProfile.avatar_url,
                is_admin_profile: clickedProfile.is_admin_profile ?? false,
                elo:
                  clickedProfile.id === currentUserProfile?.id
                    ? userElo
                    : clickedProfile.id === opponent.id
                    ? opponentElo
                    : clickedProfile.game_elo,
              }
            : null
        }
        onClose={() => setClickedProfile(null)}
        topIndex={null}
        showRank={false}
        showLikeButton
      />

      {/* Emoji picker */}
      {showEmoji && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-background/50 rounded-lg max-h-32 overflow-y-auto">
          {EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => handleEmojiClick(emoji)}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {emoji}
            </Button>
          ))}
        </div>
      )}

      {/* Turn indicator */}
      <div className="text-center mb-3">
        {gameOver ? (
          <p className="text-lg font-bold">
            {tournamentMode
              ? winner === "player"
                ? "🎉 Match vinto! Passi al round successivo"
                : "💔 Match perso. Sei eliminato dal torneo"
              : winner === "player"
              ? "🏆 Hai vinto!"
              : winner === "bot"
              ? "😢 Hai perso"
              : "🤝 Pareggio"}
          </p>
        ) : (
          <p className="text-sm font-semibold">
            {isPlayerTurn ? "🎯 Tocca a te" : "⏳ Sta giocando l'avversario..."}
          </p>
        )}
      </div>

      {/* Othello board 8x8 */}
      <div className="grid grid-cols-8 gap-0.5 mb-4 max-w-md mx-auto p-2 bg-emerald-800 rounded-lg shadow-xl">
        {board.map((cell, idx) => {
          const isValidMove = validPlayerMoves.includes(idx);
          const isHovered = hoverFlips.length > 0 && hoverFlips.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handleSquareClick(idx)}
              onMouseEnter={() => {
                if (isPlayerTurn && !gameOver) {
                  const flips = getFlipsForMove(board, idx, PLAYER);
                  if (flips.length > 0) setHoverFlips([idx, ...flips]);
                }
              }}
              onMouseLeave={() => setHoverFlips([])}
              disabled={!isPlayerTurn || gameOver || !isValidMove}
              className={cn(
                "aspect-square flex items-center justify-center bg-emerald-700 hover:bg-emerald-600 transition-all relative",
                isValidMove && "bg-emerald-600/80 cursor-pointer",
                isHovered && "ring-2 ring-yellow-300 ring-inset"
              )}
            >
              {cell === "black" && (
                <div className="w-[80%] h-[80%] rounded-full bg-gradient-to-br from-gray-700 to-black border-2 border-gray-900 shadow-md" />
              )}
              {cell === "white" && (
                <div className="w-[80%] h-[80%] rounded-full bg-gradient-to-br from-white to-gray-200 border-2 border-gray-400 shadow-md" />
              )}
              {!cell && isValidMove && (
                <div className="w-3 h-3 rounded-full bg-yellow-300/80 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="text-xs text-center text-muted-foreground space-y-1">
        <p>
          Piazza una pedina nera chiudendo tra due tue una linea di bianche → si ribaltano.
        </p>
        <p className="text-[10px]">Vince chi ha più pedine quando nessuno può più muovere.</p>
      </div>

      {/* Game result overlay — SOLO in modalità normale.
          🏆 In torneo NON lo mostriamo: il risultato del torneo e' gestito dal
          TournamentEndBanner viola (un solo banner, niente doppione grigio). */}
      {!tournamentMode && showResultOverlay && winner && (
        <GameResultOverlay
          result={winner === "player" ? "win" : winner === "bot" ? "lose" : "draw"}
          creditsEarned={6}
          eloChange={lastEloChange}
          onClose={dismissResultAndReturn}
        />
      )}

      {/* Leave confirm */}
      {showLeaveConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setShowLeaveConfirm(false)}
        >
          <Card className="max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Vuoi davvero uscire?</h3>
            <p className="text-sm text-muted-foreground">
              Se esci ora la partita conterà come sconfitta (-10 ELO).
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowLeaveConfirm(false)}>
                Resta
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  setShowLeaveConfirm(false);
                  if (leaveIntentRef.current === "reload") {
                    try {
                      localStorage.setItem("othello_pending_penalty", "1");
                    } catch {}
                    window.location.reload();
                  }
                }}
              >
                Esci comunque
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
};
