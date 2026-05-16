import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { GameResultOverlay } from "./GameResultOverlay";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  game_elo?: number;
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

    // If a pending penalty was set (e.g. previous reload), apply it once
    (async () => {
      try {
        if (localStorage.getItem("tris_pending_penalty") === "1") {
          await updateUserElo(-10);
          localStorage.removeItem("tris_pending_penalty");
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

    // Intercept back navigation
    const handlePopState = () => {
      if (allowNavigateRef.current || gameCompletedRef.current) return;
      // keep user on page and show confirmation
      history.pushState(null, "", window.location.href);
      leaveIntentRef.current = "back";
      setShowLeaveConfirm(true);
    };

    // Prepare history blocking
    history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    document.addEventListener("keydown", handleKeyDown);

    // Handle page/tab closing or toolbar reload
    const handleBeforeUnload = () => {
      if (!gameCompletedRef.current) {
        try {
          localStorage.setItem("tris_pending_penalty", "1");
        } catch {}
        // Best-effort immediate penalty (may not complete before unload)
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            supabase
              .rpc("update_game_elo", {
                user_id: session.user.id,
                elo_change: -10,
              });
          }
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup: detect game abandonment
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("keydown", handleKeyDown);
      try {
        localStorage.removeItem("tris_game_active");
      } catch {}
      if (!gameCompletedRef.current) {
        // Game was abandoned - apply penalty
        updateUserElo(-10);
      }
    };
  }, []);

  const startBotEmojiSystem = () => {
    const showRandomEmoji = () => {
      // 30% chance to show emoji
      if (Math.random() < 0.3 && !gameOver) {
        const availableEmojis = EMOJIS.filter(e => e !== lastOpponentEmoji);
        const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        
        setOpponentEmoji(randomEmoji);
        setLastOpponentEmoji(randomEmoji);
        
        setTimeout(() => {
          setOpponentEmoji(null);
        }, 4000);
      }
      
      // Schedule next check at random interval (5-15 seconds)
      if (!gameOver) {
        setTimeout(showRandomEmoji, Math.random() * 10000 + 5000);
      }
    };
    
    // Start after 3-8 seconds
    setTimeout(showRandomEmoji, Math.random() * 5000 + 3000);
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
    try {
      localStorage.setItem("tris_pending_penalty", "1");
    } catch {}
    try {
      await updateUserElo(-10);
    } catch (e) {
      console.error("Failed to apply ELO penalty on leave:", e);
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
    <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      {/* Players Row */}
      <div className="flex justify-between items-center mb-6">
        {/* Current User - Left */}
        <div className="flex items-center space-x-3 relative">
          <div className="relative">
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
          </div>
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
          <div className="relative">
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
          </div>
        </div>
      </div>

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
        {gameOver && winner === "player" && !showResultOverlay && (
          <p className="text-xl font-bold text-primary">🎉 Hai vinto! +6 crediti</p>
        )}
        {gameOver && winner === "bot" && !showResultOverlay && (
          <p className="text-xl font-bold text-destructive">😔 Hai perso!</p>
        )}
        {gameOver && winner === "draw" && !showResultOverlay && (
          <p className="text-xl font-bold text-muted-foreground">🤝 Pareggio!</p>
        )}
      </div>

      {/* Game Result Overlay */}
      {showResultOverlay && winner && (
        <GameResultOverlay
          result={winner === "player" ? "win" : winner === "bot" ? "lose" : "draw"}
          creditsEarned={winner === "player" ? 6 : 0}
          eloChange={lastEloChange}
          onClose={() => {
            setShowResultOverlay(false);
            onGameEnd(winner === "player" ? "win" : winner === "bot" ? "lose" : "draw");
          }}
        />
      )}
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
