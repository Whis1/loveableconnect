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


export const CheckersBoard = ({ opponent, onGameEnd }: CheckersBoardProps) => {
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
  const [lastOpponentEmoji, setLastOpponentEmoji] = useState<string | null>(null);
  const [userElo, setUserElo] = useState<number>(1200);
  const [opponentElo, setOpponentElo] = useState<number>(1200);
  const [isMultiCapture, setIsMultiCapture] = useState(false);
  const [capturingPiece, setCapturingPiece] = useState<number | null>(null);

  useEffect(() => {
    initializeBoard();
    fetchCurrentUserProfile();
    startBotEmojiSystem();
    setOpponentElo(Math.floor(Math.random() * 601) + 1000);

    // Cleanup function: detect game abandonment
    return () => {
      if (!gameOver) {
        // Player abandoned the game - apply penalty
        updateUserElo(-10);
      }
    };
  }, [gameOver]);

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
    if (!isPlayerTurn || gameOver) return;

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
      updateUserElo(20);
      onGameEnd("win");
      return;
    }
    
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
        blackPieces.push(currentPos);
      } else {
        currentBoard.forEach((piece, idx) => {
          if (piece && piece.includes("black")) {
            blackPieces.push(idx);
          }
        });
      }

      const allMoves: Array<{ from: number; to: number; score: number; captures: number; isJump: boolean }> = [];
      
      for (const pos of blackPieces) {
        const { regular, jumps } = getBotValidMoves(pos, currentBoard);
        
        // Evaluate jump moves
        for (const to of jumps) {
          const evaluation = evaluateMove(pos, to, currentBoard);
          allMoves.push({ from: pos, to, score: evaluation.score, captures: evaluation.captures, isJump: true });
        }
        
        // Evaluate regular moves only if no jumps available and not in multi-capture
        if (currentPos === null) {
          for (const to of regular) {
            const evaluation = evaluateMove(pos, to, currentBoard);
            allMoves.push({ from: pos, to, score: evaluation.score, captures: 0, isJump: false });
          }
        }
      }

      if (allMoves.length === 0) {
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
      
      if (bestMove.isJump) {
        const jumpedRow = Math.floor((fromRow + toRow) / 2);
        const jumpedCol = Math.floor((fromCol + toCol) / 2);
        newBoard[jumpedRow * 8 + jumpedCol] = null;
        
        // Check for continuation of multi-capture
        const { jumps } = getBotValidMoves(bestMove.to, newBoard);
        
        if (jumps.length > 0) {
          return makeOneBotMove(newBoard, bestMove.to);
        }
      }
      
      // King promotion
      if (piece === "black" && toRow === 7) {
        newBoard[bestMove.to] = "black-king";
      }
      
      return newBoard;
    };

    const newBoard = makeOneBotMove(board);
    
    const boardChanged = JSON.stringify(newBoard) !== JSON.stringify(board);
    
    if (!boardChanged) {
      setGameOver(true);
      setWinner("player");
      updateUserElo(20);
      onGameEnd("win");
      return;
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

  const getBotValidMoves = (position: number, currentBoard: Board = board): { regular: number[]; jumps: number[] } => {
    const piece = currentBoard[position];
    if (!piece || !piece.includes("black")) return { regular: [], jumps: [] };

    const regular: number[] = [];
    const jumps: number[] = [];
    const row = Math.floor(position / 8);
    const col = position % 8;
    const isKing = piece === "black-king";

    const directions = isKing ? [-1, 1] : [1];
    
    for (const dir of directions) {
      // Regular moves
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
      
      // Jump moves (captures)
      const jumpRow = row + dir * 2;
      if (jumpRow >= 0 && jumpRow < 8) {
        for (const dc of [-1, 1]) {
          const jumpCol = col + dc * 2;
          if (jumpCol >= 0 && jumpCol < 8) {
            const jumpPos = jumpRow * 8 + jumpCol;
            const middlePos = (row + dir) * 8 + (col + dc);
            const middlePiece = currentBoard[middlePos];
            
            if (currentBoard[jumpPos] === null && middlePiece && middlePiece.includes("red")) {
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
