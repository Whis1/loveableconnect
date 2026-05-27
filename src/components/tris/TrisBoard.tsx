import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X as XIcon, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { GameResultOverlay } from "./GameResultOverlay";
import { ProfileStatsDialog } from "./ProfileStatsDialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  game_elo?: number;
  is_admin_profile?: boolean;
}

interface TrisBoardProps {
  opponent: Profile;
  onGameEnd: (result: "win" | "lose" | "draw") => void;
}

type CellValue = "X" | "O" | null;
type Board = CellValue[];

const EMOJIS = [
  // Felici e positive
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
  // Divertenti e giocose
  "🤪", "😜", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "😏", "😒", "🙄", "😬", "🤥",
  // Sorprese e shock
  "😮", "😯", "😲", "😳", "🥺", "😦", "😧", "😨", "😰", "😥",
  // Tristi e arrabbiate
  "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬",
  // Competitive e sfida
  "😈", "👿", "💀", "☠️", "🤡", "👹", "👺", "👻", "👽", "🤖",
  // Reazioni
  "🥴", "😵", "😵‍💫", "🤯", "🥶", "🥵", "🤢", "🤮", "🤧", "😷", "🤒", "🤕",
  // Speciali e cool
  "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾",
  // Gesti e mani
  "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙",
  "👈", "👉", "👆", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏",
  // Festivi
  "🎉", "🎊", "🎈", "🎀", "🎁", "🎂", "🎄", "🎆", "🎇", "✨", "🎯", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️",
  // Emoji d'azione
  "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄",
  // Cuori
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
  // Fiamme e potere
  "🔥", "💥", "💫", "⭐", "🌟", "✨", "⚡", "💢", "💨", "💦", "💤",
  // Simboli competitivi
  "💯", "🆚", "🔝", "🔱", "⚔️", "🛡️", "🏹", "🗡️", "🔫", "💣", "🧨",
];


export const TrisBoard = ({ opponent, onGameEnd }: TrisBoardProps) => {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(Math.random() > 0.5); // Random start
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"player" | "bot" | "draw" | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  // 🆕 Avatar cliccabile durante la partita → apre ProfileStatsDialog
  const [clickedProfile, setClickedProfile] = useState<Profile | null>(null);
  const [userEmoji, setUserEmoji] = useState<string | null>(null);
  const [opponentEmoji, setOpponentEmoji] = useState<string | null>(null);
  const [lastOpponentEmoji, setLastOpponentEmoji] = useState<string | null>(null);
  const [userElo, setUserElo] = useState<number>(1200);
  const [opponentElo, setOpponentElo] = useState<number>(1200);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const gameCompletedRef = useRef(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const leaveIntentRef = useRef<"reload" | "back" | null>(null);
  const allowNavigateRef = useRef(false);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [lastEloChange, setLastEloChange] = useState(0);

  // 🛡️ Ref anti-double-call: evita che onGameEnd venga invocato 2 volte.
  //    Stesso pattern usato in OthelloBoard/CheckersBoard.
  const resultClosedRef = useRef(false);

  const dismissResultAndReturn = () => {
    if (resultClosedRef.current) return;
    resultClosedRef.current = true;
    setShowResultOverlay(false);
    onGameEnd(winner === "player" ? "win" : winner === "bot" ? "lose" : "draw");
  };

  // 🔧 ADMIN TEST: forza vittoria istantanea per testare il flusso post-game.
  const isAdmin = useIsAdmin();
  const forceAdminWin = async () => {
    if (gameCompletedRef.current) return;
    gameCompletedRef.current = true;
    setGameOver(true);
    setWinner("player");
    await updateUserElo(20);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.rpc("increment_game_stat" as any, {
          p_user_id: session.user.id,
          p_game: "tris",
          p_result: "win",
        });
      }
    } catch {}
    setLastEloChange(20);
    setShowResultOverlay(true);
  };

  // 🔧 ADMIN TEST: forza sconfitta istantanea per testare il flusso post-loss.
  const forceAdminLose = async () => {
    if (gameCompletedRef.current) return;
    gameCompletedRef.current = true;
    setGameOver(true);
    setWinner("bot");
    await updateUserElo(-10);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.rpc("increment_game_stat" as any, {
          p_user_id: session.user.id,
          p_game: "tris",
          p_result: "lose",
        });
      }
    } catch {}
    setLastEloChange(-10);
    setShowResultOverlay(true);
  };

  // Auto-close partita dopo 3.5s come fallback (l'utente vede il messaggio
  // inline "Hai vinto/Hai perso/Pareggio" sopra la board e poi torniamo
  // automaticamente alla pagina Sfida).
  useEffect(() => {
    if (!showResultOverlay || !winner) return;
    const t = setTimeout(dismissResultAndReturn, 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResultOverlay, winner]);

  useEffect(() => {
    fetchCurrentUserProfile();
    startBotEmojiSystem();
    // ELO avversario: stesso valore del profilo, coerente con la classifica
    setOpponentElo(opponent.game_elo || 1200);


    // Realtime ELO updates
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        channel = supabase
          .channel('tris-elo-updates')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${session.user.id}`
            },
            (payload: any) => {
              if (payload.new.game_elo !== undefined) {
                setUserElo(payload.new.game_elo);
              }
            }
          )
          .subscribe();
      }
    });

    // Mark game as active
    try {
      localStorage.setItem("tris_game_active", "1");
    } catch {}

    // 🛡️ Pending penalty da sessione precedente (es. reload/chiusura tab).
    // RIMUOVI IL MARKER SUBITO (sincrono) prima di applicare → previene race
    // con useApplyGamePendingPenalty globale che potrebbe vederlo anche lui.
    // Chi arriva primo applica; chi arriva dopo non trova il marker.
    (async () => {
      try {
        if (localStorage.getItem("tris_pending_penalty") === "1") {
          localStorage.removeItem("tris_pending_penalty");
          await updateUserElo(-10);
          await recordLossStat();
        }
      } catch (e) {
        console.error("Failed applying pending Tris penalty:", e);
      }
    })();

    // Intercept browser reload (F5 / Ctrl+R / Cmd+R)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameCompletedRef.current) return;
      const isReloadKey =
        e.key === "F5" || ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R"));
      if (isReloadKey) {
        e.preventDefault();
        leaveIntentRef.current = "reload";
        setShowLeaveConfirm(true);
      }
    };

    // 🚪 Freccia indietro del browser: NESSUN dialog. L'utente si assume la
    // responsabilità → naviga via, il cleanup unmount applica sconfitta + ELO
    // (una volta sola, grazie al pattern gameCompletedRef + marker pending).
    // Niente più pushState/popstate listener.
    document.addEventListener("keydown", handleKeyDown);

    // Handle page/tab closing or toolbar reload.
    // 🛡️ Soltanto il marker pending_penalty: al prossimo accesso, l'hook globale
    // useApplyGamePendingPenalty (o il mount di TrisBoard) lo applicherà UNA volta
    // sola. Prima si tentavano anche le RPC sincrone come 'best-effort' ma di
    // fatto andavano in concorrenza con il pending → DOPPIO incremento sconfitte.
    const handleBeforeUnload = () => {
      if (!gameCompletedRef.current) {
        try {
          localStorage.setItem("tris_pending_penalty", "1");
        } catch {}
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup: detect game abandonment
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("keydown", handleKeyDown);
      try {
        localStorage.removeItem("tris_game_active");
      } catch {}
      if (!gameCompletedRef.current) {
        // Game was abandoned - apply penalty (ELO + stat sconfitta)
        updateUserElo(-10);
        recordLossStat();
      }
    };
  }, []);

  const startBotEmojiSystem = () => {
    // 🎭 Personalità admin: 50% degli admin usa emoji, 50% no. Hash
    // deterministico dell'id (sempre stesso comportamento per quello stesso
    // admin in ogni partita: chi è "silenzioso" lo è sempre).
    const usesEmojis = parseInt((opponent.id || "0").replace(/[^0-9a-f]/gi, "").slice(0, 6) || "0", 16) % 2 === 0;
    if (!usesEmojis) return;

    const showRandomEmoji = () => {
      // 40% chance di mandare emoji quando scatta il timer
      if (Math.random() < 0.4 && !gameOver) {
        const availableEmojis = EMOJIS.filter(e => e !== lastOpponentEmoji);
        const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        setOpponentEmoji(randomEmoji);
        setLastOpponentEmoji(randomEmoji);
        setTimeout(() => {
          setOpponentEmoji(null);
        }, 4000);
      }

      // Prossima emoji random tra 30 e 50 secondi (meno spam)
      if (!gameOver) {
        setTimeout(showRandomEmoji, Math.random() * 20000 + 30000);
      }
    };

    // Prima emoji random tra 15 e 35 secondi (non immediato a inizio partita)
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
      console.log("Current user profile:", data);
    }
  };

  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) return "";
    
    // If it's already a full URL, return as is
    if (avatarPath.startsWith("http")) return avatarPath;
    
    // Otherwise construct the full Supabase Storage URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/profile-images/${avatarPath}`;
  };

  // Timer countdown effect
  useEffect(() => {
    if (gameOver) return;

    setTimeLeft(30); // Reset timer when turn changes
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Time's up - current player loses
          setGameOver(true);
          gameCompletedRef.current = true;
          if (isPlayerTurn) {
            setWinner("bot");
            updateUserElo(-10);
            setLastEloChange(-10);
            setShowResultOverlay(true);
          } else {
            setWinner("player");
            updateUserElo(20);
            setLastEloChange(20);
            setShowResultOverlay(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlayerTurn, gameOver]);

  useEffect(() => {
    if (!isPlayerTurn && !gameOver) {
      // Random delay between 4-8 seconds for more realistic gameplay
      const delay = Math.random() * 4000 + 4000;
      setTimeout(() => {
        makeBotMove();
      }, delay);
    }
  }, [isPlayerTurn, gameOver]);

  const checkWinner = (currentBoard: Board): CellValue => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        return currentBoard[a];
      }
    }
    return null;
  };

  const isBoardFull = (currentBoard: Board) => {
    return currentBoard.every((cell) => cell !== null);
  };

  const handleCellClick = (index: number) => {
    if (board[index] || !isPlayerTurn || gameOver) return;

    const newBoard = [...board];
    newBoard[index] = "X";
    setBoard(newBoard);

    const win = checkWinner(newBoard);
    if (win === "X") {
      setGameOver(true);
      setWinner("player");
      gameCompletedRef.current = true;
      updateUserElo(20);
      setLastEloChange(20);
      setShowResultOverlay(true);
      return;
    }

    if (isBoardFull(newBoard)) {
      setGameOver(true);
      setWinner("draw");
      gameCompletedRef.current = true;
      setLastEloChange(0);
      setShowResultOverlay(true);
      return;
    }

    setIsPlayerTurn(false);
  };

  const makeBotMove = () => {
    const newBoard = [...board];

    // Bot AI: Smart but not unbeatable
    // 1. Try to win
    const winMove = findWinningMove(newBoard, "O");
    if (winMove !== -1) {
      newBoard[winMove] = "O";
    } else {
      // 2. Block player from winning
      const blockMove = findWinningMove(newBoard, "X");
      if (blockMove !== -1) {
        newBoard[blockMove] = "O";
      } else {
        // 3. Take center if available
        if (newBoard[4] === null) {
          newBoard[4] = "O";
        } else {
          // 4. Take a corner or random
          const emptyCells = newBoard
            .map((cell, idx) => (cell === null ? idx : null))
            .filter((idx) => idx !== null) as number[];
          const corners = [0, 2, 6, 8].filter((idx) => emptyCells.includes(idx));
          if (corners.length > 0) {
            newBoard[corners[Math.floor(Math.random() * corners.length)]] = "O";
          } else {
            newBoard[emptyCells[Math.floor(Math.random() * emptyCells.length)]] =
              "O";
          }
        }
      }
    }

    setBoard(newBoard);

    const win = checkWinner(newBoard);
    if (win === "O") {
      setGameOver(true);
      setWinner("bot");
      gameCompletedRef.current = true;
      updateUserElo(-10);
      setLastEloChange(-10);
      setShowResultOverlay(true);
      return;
    }

    if (isBoardFull(newBoard)) {
      setGameOver(true);
      setWinner("draw");
      gameCompletedRef.current = true;
      setLastEloChange(0);
      setShowResultOverlay(true);
      return;
    }

    setIsPlayerTurn(true);
  };

  const findWinningMove = (currentBoard: Board, player: CellValue): number => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      const cells = [currentBoard[a], currentBoard[b], currentBoard[c]];
      const playerCount = cells.filter((cell) => cell === player).length;
      const emptyCount = cells.filter((cell) => cell === null).length;

      if (playerCount === 2 && emptyCount === 1) {
        if (currentBoard[a] === null) return a;
        if (currentBoard[b] === null) return b;
        if (currentBoard[c] === null) return c;
      }
    }
    return -1;
  };

  const updateUserElo = async (eloChange: number) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await supabase.rpc("update_game_elo", {
        user_id: session.user.id,
        elo_change: eloChange,
      });

      // Update local state
      setUserElo((prev) => Math.max(0, prev + eloChange));
    } catch (error) {
      console.error("Error updating ELO:", error);
    }
  };

  // 🛡️ Registra una sconfitta nelle stats partite per anti-evasione.
  // Chiamata in tutti gli scenari di abbandono (mount-after-reload, unload,
  // unmount-not-completed, confirmLeave). Best-effort: errori non bloccanti.
  const recordLossStat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.rpc("increment_game_stat" as any, {
        p_user_id: session.user.id,
        p_game: "tris",
        p_result: "lose",
      });
    } catch (e) {
      console.warn("recordLossStat (tris) non bloccante:", e);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setUserEmoji(emoji);
    setShowEmoji(false);
    
    // Remove emoji after 4 seconds
    setTimeout(() => {
      setUserEmoji(null);
    }, 4000);
  };

  const cancelLeave = () => {
    setShowLeaveConfirm(false);
    leaveIntentRef.current = null;
  };

  const confirmLeave = async () => {
    // 🛡️ Setta SUBITO gameCompletedRef.current=true → blocca il cleanup unmount
    // che altrimenti applicherebbe una SECONDA sconfitta (causa principale del
    // doppione: confirmLeave applicava +1, poi unmount riapplicava +1).
    gameCompletedRef.current = true;

    try {
      await updateUserElo(-10);
      await recordLossStat();
    } catch (e) {
      console.error("Failed to apply ELO penalty on leave:", e);
      // Fallback: se le RPC sono fallite, lascia marker per il prossimo accesso
      try {
        localStorage.setItem("tris_pending_penalty", "1");
      } catch {}
    }

    setShowLeaveConfirm(false);
    if (leaveIntentRef.current === "reload") {
      window.location.reload();
    } else if (leaveIntentRef.current === "back") {
      allowNavigateRef.current = true;
      window.history.back();
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 relative">
      {/* 🔧 ADMIN: pulsanti test "Vinci ora" / "Perdi ora" — visibili solo a
          user_roles.role='admin'. */}
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
      {/* Players Row */}
      <div className="flex justify-between items-center mb-6">
        {/* Current User - Left */}
        <div className="flex items-center space-x-3 relative">
          <button
            type="button"
            onClick={() => {
              if (currentUserProfile) {
                setClickedProfile({
                  id: currentUserProfile.id,
                  nickname: currentUserProfile.nickname,
                  avatar_url: currentUserProfile.avatar_url,
                  is_admin_profile: false,
                  game_elo: userElo,
                });
              }
            }}
            className="relative cursor-pointer hover:scale-110 transition-transform"
            title="Vedi le tue statistiche"
          >
            <Avatar className="w-14 h-14 border-2 border-primary">
              <AvatarImage src={getAvatarUrl(currentUserProfile?.avatar_url)} />
              <AvatarFallback>
                {currentUserProfile?.nickname.slice(0, 2).toUpperCase() || "Tu"}
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
            <p className="text-xs text-muted-foreground">Tu</p>
            <p className="text-xs font-semibold text-primary">ELO: {userElo}</p>
          </div>
        </div>

        {/* Emoji Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEmoji(!showEmoji)}
          className="shrink-0"
        >
          😊
        </Button>

        {/* Opponent - Right */}
        <div className="flex items-center space-x-3 relative">
          <div>
            <p className="font-bold text-right">{opponent.nickname}</p>
            <p className="text-xs text-muted-foreground text-right">Sfidante</p>
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
              <AvatarFallback>
                {opponent.nickname.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {opponentEmoji && (
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-3xl animate-bounce">
                {opponentEmoji}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Dialog statistiche profilo cliccato (avatar tuo o dell'avversario) */}
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

      {showEmoji && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-background/50 rounded-lg">
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

      <div className="grid grid-cols-3 gap-3 mb-6 max-w-xs mx-auto">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleCellClick(index)}
            disabled={!isPlayerTurn || gameOver || cell !== null}
            className={cn(
              "aspect-square rounded-lg border-2 flex items-center justify-center text-4xl font-bold transition-all",
              cell === "X" && "bg-primary/20 border-primary text-primary",
              cell === "O" && "bg-destructive/20 border-destructive text-destructive",
              cell === null && "bg-muted/30 border-muted hover:border-primary hover:bg-primary/10",
              !isPlayerTurn && "cursor-not-allowed opacity-50"
            )}
          >
            {cell}
          </button>
        ))}
      </div>

      <div className="text-center">
        {!gameOver && (
          <div className="space-y-2">
            <p className="text-lg font-semibold">
              {isPlayerTurn ? "🎮 Il tuo turno" : "⏳ Turno dell'avversario..."}
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Tempo rimanente:</span>
              <span className={cn(
                "text-2xl font-bold tabular-nums",
                timeLeft <= 10 ? "text-destructive animate-pulse" : "text-primary"
              )}>
                {timeLeft}s
              </span>
            </div>
          </div>
        )}
        {/* Testi inline a fine partita: mostriamo subito win/perso/pareggio
            sopra la board, niente piu' overlay popup brutto. Dopo ~2.5s
            torniamo automaticamente alla pagina Sfida (gestito dall'useEffect
            "auto-close" qui sotto). */}
        {gameOver && winner === "player" && (
          <p className="text-xl font-bold text-primary">🎉 Hai vinto! +6 crediti</p>
        )}
        {gameOver && winner === "bot" && (
          <p className="text-xl font-bold text-destructive">😔 Hai perso!</p>
        )}
        {gameOver && winner === "draw" && (
          <p className="text-xl font-bold text-muted-foreground">🤝 Pareggio!</p>
        )}
      </div>
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-[90%] max-w-md p-6 shadow-lg">
            <h2 className="text-lg font-bold mb-2">Conferma abbandono</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Sicuro di voler ricaricare la pagina, così facendo perderai il tuo ELO sul risultato di sconfitta
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={cancelLeave}>Resta</Button>
              <Button variant="destructive" onClick={confirmLeave}>Abbandona</Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
};
