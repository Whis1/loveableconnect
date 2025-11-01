import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  tris_elo?: number;
}

interface CheckersBoardProps {
  opponent: Profile;
  onGameEnd: (result: "win" | "lose" | "draw") => void;
}

type PieceType = "red" | "black" | "red-king" | "black-king" | null;
type Board = PieceType[];

const EMOJIS = ["😀", "😂", "😍", "🎉", "🔥", "💪", "👍", "😎", "😢", "😠"];

export const CheckersBoard = ({ opponent, onGameEnd }: CheckersBoardProps) => {
  const [board, setBoard] = useState<Board>([]);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [validMoves, setValidMoves] = useState<number[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"player" | "bot" | "draw" | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [userEmoji, setUserEmoji] = useState<string | null>(null);
  const [opponentEmoji, setOpponentEmoji] = useState<string | null>(null);
  const [lastOpponentEmoji, setLastOpponentEmoji] = useState<string | null>(null);
  const [userElo, setUserElo] = useState<number>(1200);
  const [opponentElo, setOpponentElo] = useState<number>(1200);

  useEffect(() => {
    initializeBoard();
    fetchCurrentUserProfile();
    startBotEmojiSystem();
    setOpponentElo(Math.floor(Math.random() * 601) + 1000);
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
    const showRandomEmoji = () => {
      if (Math.random() < 0.3 && !gameOver) {
        const availableEmojis = EMOJIS.filter(e => e !== lastOpponentEmoji);
        const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        
        setOpponentEmoji(randomEmoji);
        setLastOpponentEmoji(randomEmoji);
        
        setTimeout(() => {
          setOpponentEmoji(null);
        }, 4000);
      }
      
      if (!gameOver) {
        setTimeout(showRandomEmoji, Math.random() * 10000 + 5000);
      }
    };
    
    setTimeout(showRandomEmoji, Math.random() * 5000 + 3000);
  };

  const fetchCurrentUserProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url, tris_elo")
      .eq("id", session.user.id)
      .single();

    if (data) {
      setCurrentUserProfile(data);
      setUserElo(data.tris_elo || 1200);
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
      await supabase.rpc("update_tris_elo", {
        user_id: session.user.id,
        elo_change: eloChange,
      });

      setUserElo((prev) => Math.max(0, prev + eloChange));
    } catch (error) {
      console.error("Error updating ELO:", error);
    }
  };

  const getValidMoves = (position: number): number[] => {
    const piece = board[position];
    if (!piece || !piece.includes("red")) return [];

    const moves: number[] = [];
    const row = Math.floor(position / 8);
    const col = position % 8;
    const isKing = piece === "red-king";

    // Forward moves (and backward for kings)
    const directions = isKing ? [-1, 1] : [-1];
    
    for (const dir of directions) {
      // Regular moves
      const newRow = row + dir;
      if (newRow >= 0 && newRow < 8) {
        for (const dc of [-1, 1]) {
          const newCol = col + dc;
          if (newCol >= 0 && newCol < 8) {
            const newPos = newRow * 8 + newCol;
            if (board[newPos] === null) {
              moves.push(newPos);
            }
          }
        }
      }
      
      // Jump moves
      const jumpRow = row + dir * 2;
      if (jumpRow >= 0 && jumpRow < 8) {
        for (const dc of [-1, 1]) {
          const jumpCol = col + dc * 2;
          if (jumpCol >= 0 && jumpCol < 8) {
            const jumpPos = jumpRow * 8 + jumpCol;
            const middlePos = (row + dir) * 8 + (col + dc);
            const middlePiece = board[middlePos];
            
            if (board[jumpPos] === null && middlePiece && middlePiece.includes("black")) {
              moves.push(jumpPos);
            }
          }
        }
      }
    }

    return moves;
  };

  const handleSquareClick = (index: number) => {
    if (!isPlayerTurn || gameOver) return;

    if (selectedSquare === null) {
      // Select piece
      if (board[index] && board[index]!.includes("red")) {
        setSelectedSquare(index);
        setValidMoves(getValidMoves(index));
      }
    } else {
      // Move piece
      if (validMoves.includes(index)) {
        makeMove(selectedSquare, index);
        setSelectedSquare(null);
        setValidMoves([]);
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    }
  };

  const makeMove = (from: number, to: number) => {
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
    
    if (Math.abs(toRow - fromRow) === 2) {
      // Remove jumped piece
      const jumpedRow = (fromRow + toRow) / 2;
      const jumpedCol = (fromCol + toCol) / 2;
      newBoard[jumpedRow * 8 + jumpedCol] = null;
    }
    
    // Check for king promotion
    if (piece === "red" && toRow === 0) {
      newBoard[to] = "red-king";
    }
    
    setBoard(newBoard);
    
    // Check win condition
    if (checkWin(newBoard, "red")) {
      setGameOver(true);
      setWinner("player");
      updateUserElo(20);
      onGameEnd("win");
      return;
    }
    
    setIsPlayerTurn(false);
  };

  const makeBotMove = () => {
    // Simple AI: find all possible moves and pick one randomly
    const blackPieces: number[] = [];
    board.forEach((piece, idx) => {
      if (piece && piece.includes("black")) {
        blackPieces.push(idx);
      }
    });

    let allMoves: Array<{ from: number; to: number }> = [];
    
    for (const pos of blackPieces) {
      const moves = getBotValidMoves(pos);
      moves.forEach(move => {
        allMoves.push({ from: pos, to: move });
      });
    }

    if (allMoves.length === 0) {
      setGameOver(true);
      setWinner("player");
      updateUserElo(20);
      onGameEnd("win");
      return;
    }

    const move = allMoves[Math.floor(Math.random() * allMoves.length)];
    const newBoard = [...board];
    const piece = newBoard[move.from];
    
    newBoard[move.to] = piece;
    newBoard[move.from] = null;
    
    // Handle jumps
    const fromRow = Math.floor(move.from / 8);
    const fromCol = move.from % 8;
    const toRow = Math.floor(move.to / 8);
    const toCol = move.to % 8;
    
    if (Math.abs(toRow - fromRow) === 2) {
      const jumpedRow = (fromRow + toRow) / 2;
      const jumpedCol = (fromCol + toCol) / 2;
      newBoard[jumpedRow * 8 + jumpedCol] = null;
    }
    
    // King promotion
    if (piece === "black" && toRow === 7) {
      newBoard[move.to] = "black-king";
    }
    
    setBoard(newBoard);
    
    if (checkWin(newBoard, "black")) {
      setGameOver(true);
      setWinner("bot");
      updateUserElo(-10);
      onGameEnd("lose");
      return;
    }
    
    setIsPlayerTurn(true);
  };

  const getBotValidMoves = (position: number): number[] => {
    const piece = board[position];
    if (!piece || !piece.includes("black")) return [];

    const moves: number[] = [];
    const row = Math.floor(position / 8);
    const col = position % 8;
    const isKing = piece === "black-king";

    const directions = isKing ? [-1, 1] : [1];
    
    for (const dir of directions) {
      const newRow = row + dir;
      if (newRow >= 0 && newRow < 8) {
        for (const dc of [-1, 1]) {
          const newCol = col + dc;
          if (newCol >= 0 && newCol < 8) {
            const newPos = newRow * 8 + newCol;
            if (board[newPos] === null) {
              moves.push(newPos);
            }
          }
        }
      }
      
      const jumpRow = row + dir * 2;
      if (jumpRow >= 0 && jumpRow < 8) {
        for (const dc of [-1, 1]) {
          const jumpCol = col + dc * 2;
          if (jumpCol >= 0 && jumpCol < 8) {
            const jumpPos = jumpRow * 8 + jumpCol;
            const middlePos = (row + dir) * 8 + (col + dc);
            const middlePiece = board[middlePos];
            
            if (board[jumpPos] === null && middlePiece && middlePiece.includes("red")) {
              moves.push(jumpPos);
            }
          }
        }
      }
    }

    return moves;
  };

  const checkWin = (currentBoard: Board, color: string): boolean => {
    const opponentColor = color === "red" ? "black" : "red";
    return !currentBoard.some(piece => piece && piece.includes(opponentColor));
  };

  useEffect(() => {
    if (!isPlayerTurn && !gameOver) {
      // Random delay between 4-8 seconds for more realistic gameplay
      const delay = Math.random() * 4000 + 4000;
      setTimeout(() => {
        makeBotMove();
      }, delay);
    }
  }, [isPlayerTurn, gameOver]);

  const handleEmojiClick = (emoji: string) => {
    setUserEmoji(emoji);
    setShowEmoji(false);
    
    setTimeout(() => {
      setUserEmoji(null);
    }, 4000);
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
      {/* Players Row */}
      <div className="flex justify-between items-center mb-6">
        {/* Current User */}
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

        {/* Opponent */}
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

      {/* Checkers Board */}
      <div className="grid grid-cols-8 gap-0 mb-6 max-w-md mx-auto border-4 border-purple-800/50 rounded-lg overflow-hidden">
        {board.map((piece, index) => {
          const row = Math.floor(index / 8);
          const col = index % 8;
          const isDark = (row + col) % 2 === 1;
          const isSelected = selectedSquare === index;
          const isValidMove = validMoves.includes(index);
          
          return (
            <button
              key={index}
              onClick={() => handleSquareClick(index)}
              disabled={!isPlayerTurn || gameOver}
              className={cn(
                "aspect-square flex items-center justify-center text-3xl transition-all relative",
                isDark ? "bg-purple-800/40" : "bg-purple-200/20",
                isSelected && "ring-4 ring-yellow-400",
                isValidMove && "ring-4 ring-green-400 animate-pulse",
                !isPlayerTurn && "cursor-not-allowed opacity-50"
              )}
            >
              {piece === "red" && <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-red-900" />}
              {piece === "black" && <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border-2 border-gray-950" />}
              {piece === "red-king" && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-red-900 flex items-center justify-center text-yellow-300 text-xl">
                  👑
                </div>
              )}
              {piece === "black-king" && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border-2 border-gray-950 flex items-center justify-center text-yellow-300 text-xl">
                  👑
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-center">
        {!gameOver && (
          <p className="text-lg font-semibold">
            {isPlayerTurn ? "🎮 Il tuo turno" : "⏳ Turno dell'avversario..."}
          </p>
        )}
        {gameOver && winner === "player" && (
          <p className="text-xl font-bold text-primary">🎉 Hai vinto! +6 crediti</p>
        )}
        {gameOver && winner === "bot" && (
          <p className="text-xl font-bold text-destructive">😔 Hai perso!</p>
        )}
      </div>
    </Card>
  );
};
