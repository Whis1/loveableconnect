import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameState } from "./types";

interface ResolutionDisplayProps {
  gameState: GameState;
  userProfile: any;
  opponentProfile: any;
  currentAction: string;
}

export const ResolutionDisplay = ({
  gameState,
  userProfile,
  opponentProfile,
  currentAction
}: ResolutionDisplayProps) => {
  const currentPlayer = gameState.currentResolutionPlayer;
  const isUserTurn = currentPlayer === 'blue';
  const playerName = isUserTurn ? userProfile?.nickname : opponentProfile?.nickname;

  return (
    <Card className="p-4 bg-background/95 border-2 border-amber-500/50">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Risoluzione Round {gameState.roundNumber}</h3>
          <Badge variant="outline" className="animate-pulse">
            In corso...
          </Badge>
        </div>

        <div className={`p-3 rounded-lg ${isUserTurn ? 'bg-blue-500/20' : 'bg-red-500/20'}`}>
          <p className="text-sm font-medium">
            Turno di <span className={isUserTurn ? 'text-blue-500' : 'text-red-500'}>{playerName}</span>
          </p>
          <p className="text-lg font-bold mt-1">{currentAction}</p>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Le azioni vengono eseguite in sequenza
        </div>
      </div>
    </Card>
  );
};
