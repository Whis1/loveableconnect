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

interface CheckersBoardProps {
  opponent: Profile;
  onGameEnd: (result: "win" | "lose" | "draw") => void;
  /** 🏆 Modalità torneo: skip update_game_elo + increment_game_stat (gestiti
   *  da claim_tournament_rewards alla fine del torneo). Niente penalty
   *  abbandono in unmount perche' il torneo ha la sua logica abandon. */
  tournamentMode?: boolean;
}

type PieceType = "red" | "black" | "red-king" | "black-king" | null;
type Board = PieceType[];

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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface CaptureHop {
  from: number;
  to: number;
  captured: number;
}

// Ricostruisce la sequenza di salti di una cattura confrontando la board
// prima e dopo la mossa. Restituisce null se la mossa non era una cattura.
function reconstructCapture(prev: Board, next: Board): CaptureHop[] | null {
  const removed: number[] = [];
  const added: number[] = [];
  for (let i = 0; i < 64; i++) {
    const p = prev[i] ?? null;
    const n = next[i] ?? null;
    if (p && !n) removed.push(i);
    if (!p && n) added.push(i);
  }
  if (added.length !== 1) return null;
  const final = added[0];
  const moverIsRed = (next[final] || "").includes("red");
  const origin = removed.find((i) => {
    const piece = prev[i] || "";
    return moverIsRed ? piece.includes("red") : piece.includes("black");
  });
  if (origin === undefined) return null;
  const captured = removed.filter((i) => i !== origin);
  if (captured.length === 0) return null;

  const remaining = new Set(captured);
  const hops: CaptureHop[] = [];
  let cur = origin;
  let guard = 0;
  while (remaining.size > 0 && guard++ < 24) {
    const row = Math.floor(cur / 8);
    const col = cur % 8;
    let advanced = false;
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const mr = row + dr;
      const mc = col + dc;
      const lr = row + dr * 2;
      const lc = col + dc * 2;
      if (mr < 0 || mr > 7 || mc < 0 || mc > 7) continue;
      if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
      const mid = mr * 8 + mc;
      if (!remaining.has(mid)) continue;
      hops.push({ from: cur, to: lr * 8 + lc, captured: mid });
      remaining.delete(mid);
      cur = lr * 8 + lc;
      advanced = true;
      break;
    }
    if (!advanced) break;
  }
  return hops.length > 0 ? hops : null;
}

// Disegno di una singola pedina (riusato dalle caselle e dall'animazione).
function renderPiece(piece: PieceType) {
  if (piece === "red")
    return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-red-900" />;
  if (piece === "black")
    return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border-2 border-gray-950" />;
  if (piece === "red-king")
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-red-900 flex items-center justify-center text-yellow-300 text-xl">
        👑
      </div>
    );
  if (piece === "black-king")
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border-2 border-gray-950 flex items-center justify-center text-yellow-300 text-xl">
        👑
      </div>
    );
  return null;
}


export const CheckersBoard = ({ opponent, onGameEnd, tournamentMode = false }: CheckersBoardProps) => {
  const [board, setBoard] = useState<Board>([]);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [validMoves, setValidMoves] = useState<number[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(Math.random() > 0.5); // Random start
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"player" | "bot" | "draw" | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [userEmoji, setUserEmoji] = useState<string | null>(null);
  const [opponentEmoji, setOpponentEmoji] = useState<string | null>(null);
  // 🆕 Avatar cliccabile → apre ProfileStatsDialog
  const [clickedProfile, setClickedProfile] = useState<Profile | null>(null);
  const [lastOpponentEmoji, setLastOpponentEmoji] = useState<string | null>(null);
  const [userElo, setUserElo] = useState<number>(1200);
  const [opponentElo, setOpponentElo] = useState<number>(1200);
  const [timeLeft, setTimeLeft] = useState<number>(40);
  const [isMultiCapture, setIsMultiCapture] = useState(false);
  const [capturingPiece, setCapturingPiece] = useState<number | null>(null);
  const gameCompletedRef = useRef(false);
  const moveCountRef = useRef(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const leaveIntentRef = useRef<"reload" | "back" | null>(null);
  const allowNavigateRef = useRef(false);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [lastEloChange, setLastEloChange] = useState(0);
  const [displayBoard, setDisplayBoard] = useState<Board>([]);

  // 🛡️ Ref anti-double-call (vedi OthelloBoard per spiegazione).
  const resultClosedRef = useRef(false);

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
      // Stats win in modo non-bloccante
      (async () => {
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
      })();
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

  // Auto-close partita dopo 3.5s come fallback se l'utente non clicca Continua.
  useEffect(() => {
    if (!showResultOverlay || !winner) return;
    const t = setTimeout(dismissResultAndReturn, 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResultOverlay, winner]);
  const [animOverlay, setAnimOverlay] = useState<{ piece: PieceType; index: number } | null>(null);
  const [vanishing, setVanishing] = useState<Set<number>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const prevBoardRef = useRef<Board | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    initializeBoard();
    fetchCurrentUserProfile();
    startBotEmojiSystem();
    // ELO avversario: stesso valore del profilo, coerente con la classifica
    setOpponentElo(opponent.game_elo || 1200);

    // Realtime ELO updates
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        channel = supabase
          .channel('checkers-elo-updates')
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
      localStorage.setItem("checkers_game_active", "1");
    } catch {}

    // 🛡️ Pending penalty: rimuovi marker SUBITO per evitare doppia applicazione
    // (race con useApplyGamePendingPenalty globale).
    (async () => {
      try {
        if (localStorage.getItem("checkers_pending_penalty") === "1") {
          localStorage.removeItem("checkers_pending_penalty");
          await updateUserElo(-10);
          await recordLossStat();
        }
      } catch (e) {
        console.error("Failed applying pending Checkers penalty:", e);
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
    // responsabilità → naviga via, cleanup unmount applica sconfitta + ELO.
    document.addEventListener("keydown", handleKeyDown);

    // 🛡️ Solo marker pending_penalty per evitare doppia applicazione.
    const handleBeforeUnload = () => {
      if (!gameCompletedRef.current) {
        try {
          localStorage.setItem("checkers_pending_penalty", "1");
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
        localStorage.removeItem("checkers_game_active");
      } catch {}
      if (!gameCompletedRef.current) {
        // Game was abandoned - apply penalty (ELO + stat sconfitta)
        updateUserElo(-10);
        recordLossStat();
      }
    };
  }, []);

  const initializeBoard = () => {
    const newBoard: Board = Array(64).fill(null);
    
    // Setup black pieces (bot) - top rows
    for (let i = 0; i < 24; i++) {
      const row = Math.floor(i / 8);
      const col = i % 8;
      if ((row + col) % 2 === 1) {
        newBoard[i] = "black";
      }
    }
    
    // Setup red pieces (player) - bottom rows
    for (let i = 40; i < 64; i++) {
      const row = Math.floor(i / 8);
      const col = i % 8;
      if ((row + col) % 2 === 1) {
        newBoard[i] = "red";
      }
    }
    
    setBoard(newBoard);
  };

  const startBotEmojiSystem = () => {
    // 🎭 Personalità admin: 50% degli admin usa emoji, 50% no (silenzioso).
    // Hash deterministico dell'id: lo stesso admin ha sempre lo stesso stile.
    const usesEmojis = parseInt((opponent.id || "0").replace(/[^0-9a-f]/gi, "").slice(0, 6) || "0", 16) % 2 === 0;
    if (!usesEmojis) return;

    const showRandomEmoji = () => {
      // 40% chance ogni 30-50 secondi (meno spam, più naturale)
      if (Math.random() < 0.4 && !gameOver) {
        const availableEmojis = EMOJIS.filter(e => e !== lastOpponentEmoji);
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
    // 🏆 In modalità torneo NON tocchiamo l'ELO globale: la differenza
    //    finale (vincitore +60, sconfitta -20) la applica claim_tournament_rewards.
    if (tournamentMode) return;
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

  // 🛡️ Registra sconfitta dama nelle stats (anti-evasione). Stesso pattern
  // di TrisBoard.recordLossStat — chiamato in tutti gli scenari di abbandono.
  const recordLossStat = async () => {
    // 🏆 In modalità torneo niente increment: gli stat sono aggregati dalla
    //    RPC claim_tournament_rewards a torneo finito.
    if (tournamentMode) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.rpc("increment_game_stat" as any, {
        p_user_id: session.user.id,
        p_game: "dama",
        p_result: "lose",
      });
    } catch (e) {
      console.warn("recordLossStat (dama) non bloccante:", e);
    }
  };

  const getValidMoves = (position: number, currentBoard: Board = board): { regular: number[]; jumps: number[] } => {
    const piece = currentBoard[position];
    if (!piece || !piece.includes("red")) return { regular: [], jumps: [] };

    const regular: number[] = [];
    const jumps: number[] = [];
    const row = Math.floor(position / 8);
    const col = position % 8;
    const isKing = piece === "red-king";

    // Forward moves (and backward for kings)
    const directions = isKing ? [-1, 1] : [-1];
    
    for (const dir of directions) {
      // Regular moves (only if not in multi-capture mode)
      if (!isMultiCapture) {
        const newRow = row + dir;
        if (newRow >= 0 && newRow < 8) {
          for (const dc of [-1, 1]) {
            const newCol = col + dc;
            if (newCol >= 0 && newCol < 8) {
              const newPos = newRow * 8 + newCol;
              if (currentBoard[newPos] === null) {
                regular.push(newPos);
              }
            }
          }
        }
      }
      
      // Jump moves (captures) - always check
      const jumpRow = row + dir * 2;
      if (jumpRow >= 0 && jumpRow < 8) {
        for (const dc of [-1, 1]) {
          const jumpCol = col + dc * 2;
          if (jumpCol >= 0 && jumpCol < 8) {
            const jumpPos = jumpRow * 8 + jumpCol;
            const middlePos = (row + dir) * 8 + (col + dc);
            const middlePiece = currentBoard[middlePos];
            
            if (currentBoard[jumpPos] === null && middlePiece && middlePiece.includes("black")) {
              jumps.push(jumpPos);
            }
          }
        }
      }
    }

    return { regular, jumps };
  };

  const getAllPlayerMoves = (): { hasJumps: boolean; moves: Array<{ from: number; to: number; isJump: boolean }> } => {
    const allMoves: Array<{ from: number; to: number; isJump: boolean }> = [];
    let hasAnyJumps = false;

    board.forEach((piece, idx) => {
      if (piece && piece.includes("red")) {
        const { regular, jumps } = getValidMoves(idx);
        
        if (jumps.length > 0) {
          hasAnyJumps = true;
          jumps.forEach(to => allMoves.push({ from: idx, to, isJump: true }));
        }
        
        regular.forEach(to => allMoves.push({ from: idx, to, isJump: false }));
      }
    });

    return { hasJumps: hasAnyJumps, moves: allMoves };
  };

  const handleSquareClick = (index: number) => {
    if (!isPlayerTurn || gameOver || animatingRef.current) return;

    // If in multi-capture mode, only the capturing piece can be selected
    if (isMultiCapture && capturingPiece !== null) {
      if (selectedSquare === null && index === capturingPiece) {
        setSelectedSquare(index);
        const { jumps } = getValidMoves(index);
        setValidMoves(jumps);
      } else if (selectedSquare !== null && validMoves.includes(index)) {
        makeMove(selectedSquare, index, true);
      }
      return;
    }

    if (selectedSquare === null) {
      // Select piece
      if (board[index] && board[index]!.includes("red")) {
        const { regular, jumps } = getValidMoves(index);
        const { hasJumps } = getAllPlayerMoves();
        
        // If there are jumps available anywhere, only show jumps for this piece
        const movesToShow = hasJumps ? jumps : [...regular, ...jumps];
        
        setSelectedSquare(index);
        setValidMoves(movesToShow);
      }
    } else {
      // Move piece
      if (validMoves.includes(index)) {
        const fromRow = Math.floor(selectedSquare / 8);
        const toRow = Math.floor(index / 8);
        const isJump = Math.abs(toRow - fromRow) === 2;
        
        makeMove(selectedSquare, index, isJump);
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    }
  };

  const makeMove = (from: number, to: number, isJump: boolean) => {
    const newBoard = [...board];
    const piece = newBoard[from];
    
    // Move piece
    newBoard[to] = piece;
    newBoard[from] = null;
    
    // Check for jump
    const fromRow = Math.floor(from / 8);
    const fromCol = from % 8;
    const toRow = Math.floor(to / 8);
    const toCol = to % 8;
    
    if (isJump) {
      // Remove jumped piece
      const jumpedRow = Math.floor((fromRow + toRow) / 2);
      const jumpedCol = Math.floor((fromCol + toCol) / 2);
      newBoard[jumpedRow * 8 + jumpedCol] = null;
    }
    
    // Check for king promotion
    if (piece === "red" && toRow === 0) {
      newBoard[to] = "red-king";
    }
    
    setBoard(newBoard);
    
    // Check for multiple captures
    if (isJump) {
      const { jumps } = getValidMoves(to, newBoard);
      
      if (jumps.length > 0) {
        // More captures available - continue multi-capture
        setIsMultiCapture(true);
        setCapturingPiece(to);
        setSelectedSquare(to);
        setValidMoves(jumps);
        return;
      }
    }
    
    // No more captures - end turn
    setIsMultiCapture(false);
    setCapturingPiece(null);
    setSelectedSquare(null);
    setValidMoves([]);
    
    // Check win condition
    if (checkWin(newBoard, "red")) {
      setGameOver(true);
      setWinner("player");
      gameCompletedRef.current = true;
      updateUserElo(20);
      setLastEloChange(20);
      setShowResultOverlay(true);
      return;
    }
    
    // Completed a valid move
    moveCountRef.current += 1;
    setIsPlayerTurn(false);
  };

  const makeBotMove = () => {
    // Advanced AI Strategy with deeper evaluation
    const evaluateBoard = (boardState: Board, forBlack: boolean): number => {
      let score = 0;
      
      // Count pieces for endgame detection
      let ourPieces = 0;
      let theirPieces = 0;
      let ourKings = 0;
      let theirKings = 0;
      
      boardState.forEach((piece) => {
        if (!piece) return;
        const isBlack = piece.includes("black");
        const isKing = piece.includes("king");
        
        if (isBlack === forBlack) {
          ourPieces++;
          if (isKing) ourKings++;
        } else {
          theirPieces++;
          if (isKing) theirKings++;
        }
      });
      
      const isEndgame = ourPieces + theirPieces <= 8;
      
      boardState.forEach((piece, idx) => {
        if (!piece) return;
        
        const row = Math.floor(idx / 8);
        const col = idx % 8;
        const isBlack = piece.includes("black");
        const isKing = piece.includes("king");
        
        if (isBlack === forBlack) {
          // Our pieces
          if (isKing) {
            score += 50; // Kings are extremely valuable
            
            // In endgame, kings should be more aggressive
            if (isEndgame) {
              score += 15;
            }
            
            // Kings should control center
            const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
            score += (7 - centerDist) * 2;
          } else {
            score += 15; // Base piece value
            
            // Strong advancement bonus (exponential)
            if (isBlack) {
              const advancement = 7 - row;
              score += advancement * advancement * 0.8; // Exponential reward
              
              // Extra bonus for pieces about to promote
              if (row === 6) score += 12;
              if (row === 5) score += 6;
            }
          }
          
          // Strategic positioning
          // Strong center control (especially rows 3-4, cols 2-5)
          if (row >= 3 && row <= 4 && col >= 2 && col <= 5) {
            score += 5;
          } else if (row >= 2 && row <= 5 && col >= 2 && col <= 5) {
            score += 3;
          }
          
          // Diagonal strength - pieces on long diagonals
          if ((row + col) % 2 === 1) {
            if (row === col || row + col === 7) {
              score += 2;
            }
          }
          
          // Protected pieces bonus
          const neighbors = [
            idx - 9, idx - 7, idx + 7, idx + 9
          ].filter(n => n >= 0 && n < 64);
          
          let protectedBy = 0;
          neighbors.forEach(n => {
            const neighborPiece = boardState[n];
            if (neighborPiece && neighborPiece.includes(forBlack ? "black" : "red")) {
              protectedBy++;
            }
          });
          score += protectedBy * 2;
          
          // Back row defense (keep at least 2 pieces in back row early game)
          if (!isEndgame && isBlack && row === 0) {
            score += 4;
          }
          
          // Edge penalty (except back row)
          if ((col === 0 || col === 7) && (isBlack ? row !== 0 : row !== 7)) {
            score -= 2;
          }
          
        } else {
          // Opponent pieces (negative value)
          if (isKing) {
            score -= 50; // Enemy kings are threats
            
            // Extra penalty if they control center
            const centerDist = Math.abs(3.5 - row) + Math.abs(3.5 - col);
            score -= (7 - centerDist) * 1.5;
          } else {
            score -= 15;
            
            // Heavily penalize advanced enemy pieces
            if (!isBlack) {
              const advancement = row;
              score -= advancement * advancement * 0.8;
              
              // Critical threat if about to promote
              if (row === 1) score -= 12;
              if (row === 2) score -= 6;
            }
          }
        }
      });
      
      // Material advantage bonus
      const pieceDiff = ourPieces - theirPieces;
      score += pieceDiff * 20;
      
      const kingDiff = ourKings - theirKings;
      score += kingDiff * 30;
      
      // Mobility bonus (check if opponent is trapped)
      if (theirPieces > 0) {
        let opponentMobility = 0;
        boardState.forEach((piece, idx) => {
          if (piece && piece.includes(forBlack ? "red" : "black")) {
            const moves = forBlack 
              ? getValidMoves(idx, boardState)
              : getBotValidMoves(idx, boardState);
            opponentMobility += moves.regular.length + moves.jumps.length;
          }
        });
        
        // If opponent has low mobility, we're in good position
        if (opponentMobility === 0) {
          score += 200; // Winning position
        } else if (opponentMobility < 3) {
          score += 30; // Opponent is constrained
        }
      }
      
      return score;
    };

    const evaluateMove = (from: number, to: number, boardState: Board, captureCount: number = 0): { score: number; captures: number } => {
      const newBoard = [...boardState];
      const piece = newBoard[from];
      
      if (!piece) return { score: -1000, captures: 0 };
      
      newBoard[to] = piece;
      newBoard[from] = null;
      
      const fromRow = Math.floor(from / 8);
      const toRow = Math.floor(to / 8);
      const fromCol = from % 8;
      const toCol = to % 8;
      
      let totalCaptures = captureCount;
      let isJump = Math.abs(toRow - fromRow) === 2;
      
      if (isJump) {
        totalCaptures++;
        const jumpedRow = Math.floor((fromRow + toRow) / 2);
        const jumpedCol = Math.floor((fromCol + toCol) / 2);
        const capturedPiece = newBoard[jumpedRow * 8 + jumpedCol];
        newBoard[jumpedRow * 8 + jumpedCol] = null;
        
        // Bonus for capturing kings
        if (capturedPiece && capturedPiece.includes("king")) {
          totalCaptures += 1; // Count king as 2 captures
        }
        
        // Check for multi-capture potential
        const { jumps } = getBotValidMoves(to, newBoard);
        
        if (jumps.length > 0) {
          // Recursively evaluate multi-captures and take the best path
          let bestMultiCapture = { score: -10000, captures: totalCaptures };
          
          for (const nextJump of jumps) {
            const multiResult = evaluateMove(to, nextJump, newBoard, totalCaptures);
            if (multiResult.captures > bestMultiCapture.captures || 
                (multiResult.captures === bestMultiCapture.captures && multiResult.score > bestMultiCapture.score)) {
              bestMultiCapture = multiResult;
            }
          }
          
          return bestMultiCapture;
        }
      }
      
      // King promotion
      if (piece === "black" && toRow === 7) {
        newBoard[to] = "black-king";
      }
      
      // Evaluate final board position
      let positionScore = evaluateBoard(newBoard, true);
      
      // Massive bonus for captures!
      positionScore += totalCaptures * 80;
      
      // Extra bonus for promotion
      if (piece === "black" && toRow === 7) {
        positionScore += 35;
      } else if (piece === "black" && toRow === 6) {
        positionScore += 15; // One move from promotion
      } else if (piece === "black" && toRow >= 5) {
        positionScore += (toRow - 4) * 5;
      }
      
      // Defensive evaluation: check if this move exposes us to capture
      let exposurePenalty = 0;
      
      // Check all possible opponent responses
      newBoard.forEach((opponentPiece, opponentIdx) => {
        if (opponentPiece && opponentPiece.includes("red")) {
          const { jumps } = getValidMoves(opponentIdx, newBoard);
          
          // If opponent can capture any of our pieces after this move
          jumps.forEach(jumpTarget => {
            const jumpFromRow = Math.floor(opponentIdx / 8);
            const jumpFromCol = opponentIdx % 8;
            const jumpToRow = Math.floor(jumpTarget / 8);
            const jumpToCol = jumpTarget % 8;
            const capturedRow = Math.floor((jumpFromRow + jumpToRow) / 2);
            const capturedCol = Math.floor((jumpFromCol + jumpToCol) / 2);
            const capturedPos = capturedRow * 8 + capturedCol;
            const capturedPiece = newBoard[capturedPos];
            
            if (capturedPiece && capturedPiece.includes("black")) {
              // We're exposing a piece to capture
              if (capturedPiece.includes("king")) {
                exposurePenalty += 40; // Very bad to lose a king
              } else {
                exposurePenalty += 20; // Bad to lose a piece
              }
              
              // Extra penalty if it's the piece we just moved
              if (capturedPos === to) {
                exposurePenalty += 15;
              }
            }
          });
        }
      });
      
      positionScore -= exposurePenalty;
      
      // Tactical bonus: check if this move creates a trap or fork
      let tacticalBonus = 0;
      
      // After our move, count how many opponent pieces we threaten
      const { jumps: ourThreats } = getBotValidMoves(to, newBoard);
      tacticalBonus += ourThreats.length * 10;
      
      // Check if we're creating multiple threats (fork)
      newBoard.forEach((ourPiece, ourIdx) => {
        if (ourPiece && ourPiece.includes("black") && ourIdx !== to) {
          const { jumps } = getBotValidMoves(ourIdx, newBoard);
          if (jumps.length > 0) {
            tacticalBonus += jumps.length * 3;
          }
        }
      });
      
      positionScore += tacticalBonus;
      
      return { score: positionScore, captures: totalCaptures };
    };

    const makeOneBotMove = (currentBoard: Board, currentPos: number | null = null): Board => {
      const blackPieces: number[] = [];
      
      if (currentPos !== null) {
        // Multi-capture mode: only the current capturing piece can move
        blackPieces.push(currentPos);
      } else {
        // Normal mode: check all black pieces
        currentBoard.forEach((piece, idx) => {
          if (piece && piece.includes("black")) {
            blackPieces.push(idx);
          }
        });
      }

      const allMoves: Array<{ from: number; to: number; score: number; captures: number; isJump: boolean }> = [];
      
      // First, check if there are any jump moves available
      let hasJumps = false;
      
      for (const pos of blackPieces) {
        const { regular, jumps } = getBotValidMoves(pos, currentBoard);
        
        // Evaluate jump moves (captures) - these are MANDATORY if available
        for (const to of jumps) {
          hasJumps = true;
          const evaluation = evaluateMove(pos, to, currentBoard);
          allMoves.push({ from: pos, to, score: evaluation.score, captures: evaluation.captures, isJump: true });
        }
        
        // Evaluate regular moves ONLY if:
        // 1. We're not in multi-capture mode (currentPos === null)
        // 2. AND there are no jumps available from ANY piece
        if (currentPos === null && !hasJumps) {
          for (const to of regular) {
            const evaluation = evaluateMove(pos, to, currentBoard);
            allMoves.push({ from: pos, to, score: evaluation.score, captures: 0, isJump: false });
          }
        }
      }

      // If no valid moves found, return unchanged board
      // This should trigger the "bot has no moves" logic in the caller
      if (allMoves.length === 0) {
        console.log("Bot has no valid moves available");
        return currentBoard;
      }

      // Find moves with maximum captures
      const maxCaptures = Math.max(...allMoves.map(m => m.captures));
      const captureMoves = allMoves.filter(m => m.captures === maxCaptures && maxCaptures > 0);
      
      let bestMove;
      
      if (captureMoves.length > 0) {
        // Among moves with max captures, pick the one with best position score
        bestMove = captureMoves.reduce((best, move) => 
          move.score > best.score ? move : best
        );
      } else {
        // No captures available - pick move with best position evaluation
        bestMove = allMoves.reduce((best, move) => 
          move.score > best.score ? move : best
        );
      }

      const newBoard = [...currentBoard];
      const piece = newBoard[bestMove.from];
      
      if (!piece) return currentBoard;
      
      newBoard[bestMove.to] = piece;
      newBoard[bestMove.from] = null;
      
      const fromRow = Math.floor(bestMove.from / 8);
      const fromCol = bestMove.from % 8;
      const toRow = Math.floor(bestMove.to / 8);
      const toCol = bestMove.to % 8;
      
      // Verify move distance is valid (1 square for regular, 2 for jump)
      const rowDiff = Math.abs(toRow - fromRow);
      const colDiff = Math.abs(toCol - fromCol);
      
      // Sanity check: all moves must be diagonal (equal row and col distance)
      if (rowDiff !== colDiff) {
        console.error("Invalid move: not diagonal", { from: bestMove.from, to: bestMove.to });
        return currentBoard;
      }
      
      // Sanity check: moves must be either 1 square (regular) or 2 squares (jump)
      if (rowDiff !== 1 && rowDiff !== 2) {
        console.error("Invalid move distance:", rowDiff, "squares", { from: bestMove.from, to: bestMove.to });
        return currentBoard;
      }
      
      if (bestMove.isJump) {
        // Verify this is actually a 2-square jump
        if (rowDiff !== 2) {
          console.error("Jump move must be 2 squares", { from: bestMove.from, to: bestMove.to });
          return currentBoard;
        }
        
        // Remove the captured piece (must be in the middle square)
        const jumpedRow = Math.floor((fromRow + toRow) / 2);
        const jumpedCol = Math.floor((fromCol + toCol) / 2);
        const jumpedPos = jumpedRow * 8 + jumpedCol;
        
        // Verify there's actually an opponent piece to capture
        const jumpedPiece = newBoard[jumpedPos];
        if (!jumpedPiece || !jumpedPiece.includes("red")) {
          console.error("No opponent piece to capture at", jumpedPos);
          return currentBoard;
        }
        
        newBoard[jumpedPos] = null;
        
        // Check for continuation of multi-capture
        const { jumps } = getBotValidMoves(bestMove.to, newBoard);
        
        if (jumps.length > 0) {
          // Recursively continue the multi-capture sequence
          return makeOneBotMove(newBoard, bestMove.to);
        }
      } else {
        // Regular move must be exactly 1 square
        if (rowDiff !== 1) {
          console.error("Regular move must be 1 square", { from: bestMove.from, to: bestMove.to });
          return currentBoard;
        }
      }
      
      // King promotion (bot reaches the opposite end)
      if (piece === "black" && toRow === 7) {
        newBoard[bestMove.to] = "black-king";
      }
      
      return newBoard;
    };

    const newBoard = makeOneBotMove(board);
    
    const boardChanged = JSON.stringify(newBoard) !== JSON.stringify(board);
    
    if (!boardChanged) {
      // Bot has no valid moves - player wins
      setGameOver(true);
      setWinner("player");
      gameCompletedRef.current = true;
      updateUserElo(20);
      setLastEloChange(20);
      setShowResultOverlay(true);
      return;
    }
    
    setBoard(newBoard);
    // Completed a valid bot move
    moveCountRef.current += 1;
    
    if (checkWin(newBoard, "black")) {
      setGameOver(true);
      setWinner("bot");
      gameCompletedRef.current = true;
      updateUserElo(-10);
      setLastEloChange(-10);
      setShowResultOverlay(true);
      return;
    }
    
    setIsPlayerTurn(true);
  };

  const getBotValidMoves = (position: number, currentBoard: Board = board): { regular: number[]; jumps: number[] } => {
    const piece = currentBoard[position];
    if (!piece || !piece.includes("black")) return { regular: [], jumps: [] };

    const regular: number[] = [];
    const jumps: number[] = [];
    const row = Math.floor(position / 8);
    const col = position % 8;
    const isKing = piece === "black-king";

    // Bot moves downward (increasing row), kings can move both ways
    const directions = isKing ? [-1, 1] : [1];
    
    for (const dir of directions) {
      // Regular moves - MUST be exactly 1 diagonal square
      const newRow = row + dir;
      if (newRow >= 0 && newRow < 8) {
        // Check both diagonal directions (left and right)
        for (const dc of [-1, 1]) {
          const newCol = col + dc;
          // Verify move is within bounds and exactly 1 square diagonally
          if (newCol >= 0 && newCol < 8) {
            const newPos = newRow * 8 + newCol;
            // Move is valid ONLY if destination is empty
            // (no need to check path since it's only 1 square)
            if (currentBoard[newPos] === null) {
              regular.push(newPos);
            }
          }
        }
      }
      
      // Jump moves (captures) - MUST be exactly 2 diagonal squares
      const jumpRow = row + dir * 2;
      if (jumpRow >= 0 && jumpRow < 8) {
        for (const dc of [-1, 1]) {
          const jumpCol = col + dc * 2;
          // Verify jump is within bounds and exactly 2 squares diagonally
          if (jumpCol >= 0 && jumpCol < 8) {
            const jumpPos = jumpRow * 8 + jumpCol;
            // Calculate the middle position (must have opponent piece)
            const middleRow = row + dir;
            const middleCol = col + dc;
            const middlePos = middleRow * 8 + middleCol;
            const middlePiece = currentBoard[middlePos];
            
            // Jump is valid ONLY if:
            // 1. Destination square is empty
            // 2. Middle square has an OPPONENT piece (red)
            // 3. Middle square does NOT have own piece (black)
            if (currentBoard[jumpPos] === null && 
                middlePiece && 
                middlePiece.includes("red") &&
                !middlePiece.includes("black")) {
              jumps.push(jumpPos);
            }
          }
        }
      }
    }

    return { regular, jumps };
  };

  const checkWin = (currentBoard: Board, color: string): boolean => {
    const opponentColor = color === "red" ? "black" : "red";
    return !currentBoard.some(piece => piece && piece.includes(opponentColor));
  };

  // Anima le catture: la pedina che mangia scorre sopra le pedine catturate,
  // che spariscono una alla volta.
  const animateCapture = async (prev: Board, next: Board, hops: CaptureHop[]) => {
    animatingRef.current = true;
    setIsAnimating(true);

    const HOP_MS = 380;
    const CAPTURE_MS = 220;
    const startIndex = hops[0].from;
    const movingPiece = prev[startIndex];

    const base = [...prev];
    base[startIndex] = null;
    setDisplayBoard(base);
    setVanishing(new Set());
    setAnimOverlay({ piece: movingPiece, index: startIndex });
    await sleep(40);

    for (const hop of hops) {
      setAnimOverlay({ piece: movingPiece, index: hop.to });
      await sleep(HOP_MS);
      setVanishing((v) => {
        const s = new Set(v);
        s.add(hop.captured);
        return s;
      });
      await sleep(CAPTURE_MS);
    }

    await sleep(60);
    setDisplayBoard(next);
    setVanishing(new Set());
    setAnimOverlay(null);
    setIsAnimating(false);
    animatingRef.current = false;
  };

  // Mantiene la board mostrata allineata a quella di gioco, animando le catture.
  useEffect(() => {
    const prev = prevBoardRef.current;
    prevBoardRef.current = board;
    if (board.length === 0) return;
    if (!prev || prev.length === 0) {
      setDisplayBoard(board);
      return;
    }
    if (animatingRef.current) return;
    const hops = reconstructCapture(prev, board);
    if (hops) {
      animateCapture(prev, board, hops);
    } else {
      setDisplayBoard(board);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  useEffect(() => {
    if (!isPlayerTurn && !gameOver) {
      // Only allow bot to move if board is initialized (has pieces)
      const boardHasPieces = board.some(cell => cell !== null);
      if (!boardHasPieces) return;
      
      // Random delay between 4-8 seconds for more realistic gameplay
      const delay = Math.random() * 4000 + 4000;
      const timeout = setTimeout(() => {
        makeBotMove();
      }, delay);
      
      return () => clearTimeout(timeout);
    }
  }, [isPlayerTurn, gameOver, board]);

  // Timer countdown effect
  useEffect(() => {
    if (gameOver) return;

    setTimeLeft(40); // Reset timer when turn changes

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsMultiCapture(false);
          setCapturingPiece(null);
          setSelectedSquare(null);
          setValidMoves([]);
          if (isPlayerTurn) {
            // Tempo scaduto per l'utente: ha perso la partita
            if (!gameCompletedRef.current) {
              gameCompletedRef.current = true;
              setGameOver(true);
              setWinner("bot");
              updateUserElo(-10);
              setLastEloChange(-10);
              setShowResultOverlay(true);
            }
          } else {
            // Tempo scaduto per l'avversario: passa il turno all'utente
            setIsPlayerTurn(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlayerTurn, gameOver]);

  const handleEmojiClick = (emoji: string) => {
    setUserEmoji(emoji);
    setShowEmoji(false);
    
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
    // che altrimenti applicherebbe una SECONDA sconfitta.
    gameCompletedRef.current = true;

    try {
      await updateUserElo(-10);
      await recordLossStat();
    } catch (e) {
      console.error("Failed to apply ELO penalty on leave:", e);
      try {
        localStorage.setItem("checkers_pending_penalty", "1");
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
    <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 relative">
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
        {/* Current User */}
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

        {/* Opponent */}
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

      {/* Checkers Board */}
      <div className="relative grid grid-cols-8 gap-0 mb-6 max-w-md mx-auto border-4 border-purple-800/50 rounded-lg overflow-hidden">
        {displayBoard.map((piece, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;
          const isDark = (row + col) % 2 === 1;
          const isSelected = selectedSquare === index;
          const isValidMove = validMoves.includes(index);
          
          return (
            <button
              key={index}
              onClick={() => handleSquareClick(index)}
              disabled={!isPlayerTurn || gameOver || isAnimating}
              className={cn(
                "aspect-square flex items-center justify-center text-3xl transition-all relative",
                isDark ? "bg-purple-800/40" : "bg-purple-200/20",
                isSelected && "ring-4 ring-yellow-400",
                isValidMove && "ring-4 ring-green-400 animate-pulse",
                !isPlayerTurn && "cursor-not-allowed opacity-50"
              )}
            >
              {piece && (
                <div
                  className={cn(
                    "transition-all duration-200",
                    vanishing.has(index) && "scale-0 opacity-0"
                  )}
                >
                  {renderPiece(piece)}
                </div>
              )}
            </button>
          );
        })}

        {animOverlay && (
          <div
            className="pointer-events-none absolute z-20 flex items-center justify-center"
            style={{
              width: "12.5%",
              height: "12.5%",
              left: `${(animOverlay.index % 8) * 12.5}%`,
              top: `${Math.floor(animOverlay.index / 8) * 12.5}%`,
              transition: "left 360ms ease-in-out, top 360ms ease-in-out",
            }}
          >
            <div className="scale-110 drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]">
              {renderPiece(animOverlay.piece)}
            </div>
          </div>
        )}
      </div>

      <div className="text-center">
        {!gameOver && (
          <div className="space-y-2">
            <p className="text-lg font-semibold">
              {isPlayerTurn ? (
                <>
                  🎮 Il tuo turno
                  {getAllPlayerMoves().hasJumps && (
                    <span className="block text-yellow-500 font-bold animate-pulse">
                      Sei obbligato a mangiare
                    </span>
                  )}
                </>
              ) : (
                "⏳ Turno dell'avversario..."
              )}
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
        {/* Testi inline a fine partita: niente piu' overlay popup, mostriamo
            il risultato sopra la board e dopo 2.5s torniamo automaticamente
            alla Sfida (gestito dall'useEffect "auto-close"). */}
        {gameOver && winner === "player" && (
          <p className="text-xl font-bold text-primary">🎉 Hai vinto! +6 crediti</p>
        )}
        {gameOver && winner === "bot" && (
          <p className="text-xl font-bold text-destructive">😔 Hai perso!</p>
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
