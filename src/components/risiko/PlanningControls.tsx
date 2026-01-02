import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check, Users, Route, Undo2 } from "lucide-react";
import { GameState, TROOPS_PER_ROUND, MAX_PLATOONS, getTotalAssignedTroops, getMovementCount } from "./types";

interface PlanningControlsProps {
  gameState: GameState;
  onReady: () => void;
  onCancelAssignment: (territoryId: string) => void;
  onCancelMovement: (index: number) => void;
  onCancelCard: () => void;
  isPlayerReady: boolean;
  isAIReady: boolean;
}

export const PlanningControls = ({
  gameState,
  onReady,
  onCancelAssignment,
  onCancelMovement,
  onCancelCard,
  isPlayerReady,
  isAIReady
}: PlanningControlsProps) => {
  const playerPlan = gameState.playerPlans.blue;
  const assignedTroops = getTotalAssignedTroops(playerPlan);
  const remainingTroops = TROOPS_PER_ROUND - assignedTroops;
  const movementCount = getMovementCount(playerPlan);
  
  const canBeReady = remainingTroops === 0;

  return (
    <Card className="p-4 bg-background/95 border-2 border-primary/30">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Round {gameState.roundNumber}</h3>
          <Badge variant={isPlayerReady ? "default" : "secondary"}>
            {isPlayerReady ? "Pronto!" : "Pianificazione"}
          </Badge>
        </div>

        {/* Troop Assignment Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Users className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Truppe da assegnare</p>
            <p className="text-xs text-muted-foreground">Obbligatorio: posiziona tutte le truppe</p>
          </div>
          <Badge variant={remainingTroops === 0 ? "default" : "destructive"} className="text-lg px-3">
            {assignedTroops}/{TROOPS_PER_ROUND}
          </Badge>
        </div>

        {/* Assigned Troops List */}
        {playerPlan.troopAssignments.length > 0 && !isPlayerReady && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Truppe pianificate:</p>
            {playerPlan.troopAssignments.map((assignment, idx) => {
              const territory = gameState.territories.find(t => t.id === assignment.territoryId);
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-primary/10 text-sm">
                  <span>+{assignment.amount} → {territory?.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelAssignment(assignment.territoryId)}
                    className="h-6 w-6 p-0"
                  >
                    <Undo2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Movement Status */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <Route className="w-5 h-5 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Spostamenti (facoltativo)</p>
            <p className="text-xs text-muted-foreground">Max 3 destinazioni diverse</p>
          </div>
          <Badge variant="secondary" className="text-lg px-3">
            {movementCount}/{MAX_PLATOONS}
          </Badge>
        </div>

        {/* Planned Movements List */}
        {playerPlan.troopMovements.length > 0 && !isPlayerReady && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Spostamenti pianificati:</p>
            {playerPlan.troopMovements.map((movement, idx) => {
              const fromTerritory = gameState.territories.find(t => t.id === movement.fromId);
              const toTerritory = gameState.territories.find(t => t.id === movement.toId);
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-blue-500/10 text-sm">
                  <span>{movement.amount} truppe: {fromTerritory?.name} → {toTerritory?.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCancelMovement(idx)}
                    className="h-6 w-6 p-0"
                  >
                    <Undo2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Card Usage */}
        {playerPlan.cardUsage && !isPlayerReady && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Carta pianificata:</p>
            <div className="flex items-center justify-between p-2 rounded bg-yellow-500/10 text-sm">
              <span>
                {playerPlan.cardUsage.cardType === 'reinforcement' && '🎴 Rinforzi'}
                {playerPlan.cardUsage.cardType === 'bomb' && '💣 Bombardamento'}
                {playerPlan.cardUsage.cardType === 'parachute' && '🪂 Paracadutista'}
                {playerPlan.cardUsage.cardType === 'force' && '⚡ Potenziamento'}
                {' → '}
                {gameState.territories.find(t => t.id === playerPlan.cardUsage?.targetTerritoryId)?.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelCard}
                className="h-6 w-6 p-0"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {isPlayerReady && !isAIReady && (
          <div className="p-3 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-center">
            <p className="text-sm font-medium">⏳ In attesa dell'avversario...</p>
          </div>
        )}

        {/* Ready Button */}
        {!isPlayerReady && (
          <Button
            size="lg"
            onClick={onReady}
            disabled={!canBeReady}
            className={`w-full h-14 text-lg font-bold ${
              canBeReady 
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' 
                : 'bg-muted'
            }`}
          >
            <Check className="w-6 h-6 mr-2" />
            {canBeReady ? 'PRONTO!' : `Assegna ancora ${remainingTroops} truppe`}
          </Button>
        )}
      </div>
    </Card>
  );
};
