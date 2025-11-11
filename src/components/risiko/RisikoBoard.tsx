import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plane, Users, Zap } from "lucide-react";
import { RisikoMap } from "./RisikoMap";
import { RisikoVictoryDialog } from "./RisikoVictoryDialog";
import { TroopMoveDialog } from "./TroopMoveDialog";
import { generateTerritories, Territory } from "./territoryGenerator";
import { simulateBattle, canMoveTroops } from "./risikoLogic";
import { aiMakeMove } from "./risikoAI";

type Player = 'blue' | 'red';
type CardType = 'troops' | 'bomb' | 'parachute' | 'force';

interface GameState {
  territories: Territory[];
  currentPlayer: Player;
  turnTimeLeft: number;
  selectedTerritory: string | null;
  selectedCard: CardType | null;
  cardCooldowns: {
    bomb: number;
    parachute: number;
    force: number;
  };
  boostedTerritories: string[];
  gameOver: boolean;
  winner: Player | null;
}

interface RisikoBoardProps {
  onGameEnd: (won: boolean) => void;
  userProfile: any;
  opponentProfile: any;
}

export const RisikoBoard = ({ onGameEnd, userProfile, opponentProfile }: RisikoBoardProps) => {
  const [gameState, setGameState] = useState<GameState>({
    territories: [],
    currentPlayer: Math.random() > 0.5 ? 'blue' : 'red',
    turnTimeLeft: 30,
    selectedTerritory: null,
    selectedCard: null,
    cardCooldowns: { bomb: 0, parachute: 0, force: 0 },
    boostedTerritories: [],
    gameOver: false,
    winner: null
  });

  const [showVictory, setShowVictory] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [targetTerritory, setTargetTerritory] = useState<string | null>(null);
  const [combatAnimation, setCombatAnimation] = useState<{show: boolean, message: string}>({show: false, message: ''});
  const [movingTroops, setMovingTroops] = useState<{
    fromId: string;
    toId: string;
    count: number;
  } | null>(null);

  // Initialize game
  useEffect(() => {
    const territories = generateTerritories();
    setGameState(prev => ({ ...prev, territories }));
  }, []);

  // Turn timer
  useEffect(() => {
    if (gameState.gameOver) return;

    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.turnTimeLeft <= 1) {
          // Switch turn
          const nextPlayer = prev.currentPlayer === 'blue' ? 'red' : 'blue';
          return {
            ...prev,
            currentPlayer: nextPlayer,
            turnTimeLeft: 30,
            selectedTerritory: null,
            selectedCard: null,
            cardCooldowns: {
              bomb: Math.max(0, prev.cardCooldowns.bomb - 1),
              parachute: Math.max(0, prev.cardCooldowns.parachute - 1),
              force: Math.max(0, prev.cardCooldowns.force - 1)
            }
          };
        }
        return { ...prev, turnTimeLeft: prev.turnTimeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.gameOver]);

  // AI turn
  useEffect(() => {
    if (gameState.currentPlayer === 'red' && !gameState.gameOver && gameState.territories.length > 0) {
      const timer = setTimeout(() => {
        aiMakeMove(gameState, setGameState, handleCombat, showCombatAnimation, opponentProfile?.nickname || 'Avversario');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameState.gameOver, gameState.territories.length]);

  // Check victory
  useEffect(() => {
    // Don't check until game has started with troops
    const totalTerritories = gameState.territories.filter(t => t.owner).length;
    if (totalTerritories < 10) return; // Wait for initialization
    
    const blueTroops = gameState.territories.filter(t => t.owner === 'blue').reduce((sum, t) => sum + t.troops, 0);
    const redTroops = gameState.territories.filter(t => t.owner === 'red').reduce((sum, t) => sum + t.troops, 0);

    if (blueTroops === 0 || redTroops === 0) {
      const winner = blueTroops > 0 ? 'blue' : 'red';
      setGameState(prev => ({ ...prev, gameOver: true, winner }));
      setShowVictory(true);
      handleGameEnd(winner === 'blue');
    }
  }, [gameState.territories]);

  const showCombatAnimation = (message: string) => {
    setCombatAnimation({show: true, message});
    setTimeout(() => setCombatAnimation({show: false, message: ''}), 3000);
  };

  const handleCombat = (attackerId: string, defenderId: string, attackerTroops: number) => {
    setGameState(prev => {
      const newTerritories = [...prev.territories];
      const attacker = newTerritories.find(t => t.id === attackerId);
      const defender = newTerritories.find(t => t.id === defenderId);

      if (!attacker || !defender) return prev;

      const isAttackerBoosted = prev.boostedTerritories.includes(attackerId);
      const isDefenderBoosted = prev.boostedTerritories.includes(defenderId);

      const result = simulateBattle(
        attackerTroops,
        defender.troops,
        isAttackerBoosted,
        isDefenderBoosted
      );

      // Show combat result
      showCombatAnimation(result.message);

      // Update territories
      attacker.troops -= attackerTroops;
      
      if (result.winner === 'attacker') {
        defender.owner = attacker.owner;
        defender.troops = result.survivingTroops;
      } else if (result.winner === 'defender') {
        defender.troops = result.survivingTroops;
      } else {
        defender.owner = null;
        defender.troops = 0;
      }

      // Remove boost after combat
      const newBoostedTerritories = prev.boostedTerritories.filter(
        id => id !== attackerId && id !== defenderId
      );

      return {
        ...prev,
        territories: newTerritories,
        boostedTerritories: newBoostedTerritories,
        selectedTerritory: null,
        selectedCard: null
      };
    });

    // End turn after combat
    setTimeout(() => switchTurn(), 3500);
  };

  const switchTurn = () => {
    setGameState(prev => ({
      ...prev,
      currentPlayer: prev.currentPlayer === 'blue' ? 'red' : 'blue',
      turnTimeLeft: 30,
      selectedTerritory: null,
      selectedCard: null
    }));
  };

  const handleTerritoryClick = (territoryId: string) => {
    if (gameState.currentPlayer !== 'blue' || gameState.gameOver) return;

    const territory = gameState.territories.find(t => t.id === territoryId);
    if (!territory) return;

    // Card usage
    if (gameState.selectedCard) {
      handleCardUsage(territoryId);
      return;
    }

    // Territory selection for movement
    if (!gameState.selectedTerritory) {
      if (territory.owner === 'blue' && territory.troops > 0) {
        setGameState(prev => ({ ...prev, selectedTerritory: territoryId }));
      }
    } else {
      if (territoryId === gameState.selectedTerritory) {
        setGameState(prev => ({ ...prev, selectedTerritory: null }));
      } else {
        const source = gameState.territories.find(t => t.id === gameState.selectedTerritory);
        if (source && canMoveTroops(source, territory, gameState.territories)) {
          setTargetTerritory(territoryId);
          setMoveDialogOpen(true);
        } else {
          toast.error("Non puoi muovere truppe qui");
        }
      }
    }
  };

  const handleMoveTroops = (amount: number) => {
    if (!gameState.selectedTerritory || !targetTerritory) return;

    // Start animation
    setMovingTroops({
      fromId: gameState.selectedTerritory,
      toId: targetTerritory,
      count: amount
    });

    // Wait for animation then update
    setTimeout(() => {
      setMovingTroops(null);

      setGameState(prev => {
        const newTerritories = [...prev.territories];
        const source = newTerritories.find(t => t.id === prev.selectedTerritory);
        const target = newTerritories.find(t => t.id === targetTerritory);

        if (!source || !target) return prev;

        source.troops -= amount;

        // Combat or movement
        if (target.owner && target.owner !== source.owner && target.troops > 0) {
          // Combat
          setTimeout(() => handleCombat(source.id, target.id, amount), 100);
          return prev;
        } else if (target.owner === source.owner) {
          // Merge
          target.troops += amount;
          toast.success(`${amount} truppe unite`);
        } else {
          // Conquest
          target.owner = source.owner;
          target.troops = amount;
          toast.success("Territorio conquistato!");
        }

        return { ...prev, territories: newTerritories };
      });

      setMoveDialogOpen(false);
      setTargetTerritory(null);
      switchTurn();
    }, 1000);
  };

  const handleCardUsage = (territoryId: string) => {
    const territory = gameState.territories.find(t => t.id === territoryId);
    if (!territory) return;

    switch (gameState.selectedCard) {
      case 'troops':
        if (territory.owner === 'blue') {
          const blueCount = gameState.territories.filter(t => t.owner === 'blue').length;
          const amount = blueCount >= 20 ? 3 : 1;
          setGameState(prev => ({
            ...prev,
            territories: prev.territories.map(t => 
              t.id === territoryId ? {...t, troops: t.troops + amount} : t
            ),
            selectedCard: null
          }));
          toast.success(`+${amount} truppe aggiunte`);
          switchTurn();
        }
        break;

      case 'bomb':
        if (gameState.cardCooldowns.bomb === 0 && territory.owner === 'red' && territory.troops > 0) {
        showCombatAnimation("💣 Bombardamento aereo!");
        setGameState(prev => ({
            ...prev,
            territories: prev.territories.map(t => {
              if (t.id === territoryId) {
                const newTroops = Math.max(0, t.troops - 1);
                return {...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner};
              }
              return t;
            }),
            cardCooldowns: {...prev.cardCooldowns, bomb: 5},
            selectedCard: null
          }));
          setTimeout(switchTurn, 1000);
        }
        break;

      case 'parachute':
        if (gameState.cardCooldowns.parachute === 0 && (!territory.owner || territory.troops === 0)) {
          showCombatAnimation("🪂 Paracadutista lanciato!");
          setGameState(prev => ({
            ...prev,
            territories: prev.territories.map(t => 
              t.id === territoryId ? {...t, owner: 'blue', troops: 1} : t
            ),
            cardCooldowns: {...prev.cardCooldowns, parachute: 3},
            selectedCard: null
          }));
          setTimeout(switchTurn, 1000);
        }
        break;

      case 'force':
        if (gameState.cardCooldowns.force === 0 && territory.owner === 'blue' && territory.troops > 0) {
          setGameState(prev => ({
            ...prev,
            boostedTerritories: [...prev.boostedTerritories, territoryId],
            cardCooldowns: {...prev.cardCooldowns, force: 3},
            selectedCard: null
          }));
          toast.success("Truppa potenziata! 💪");
          switchTurn();
        }
        break;
    }
  };

  const handleGameEnd = async (won: boolean) => {
    if (won) {
      const { data: credits } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', userProfile.id)
        .single();

      if (credits) {
        await supabase
          .from('user_credits')
          .update({ balance: credits.balance + 6 })
          .eq('user_id', userProfile.id);
      }

      await supabase
        .from('profiles')
        .update({ tris_elo: (userProfile.tris_elo || 1200) + 20 })
        .eq('id', userProfile.id);
    } else {
      await supabase
        .from('profiles')
        .update({ tris_elo: Math.max(0, (userProfile.tris_elo || 1200) - 10) })
        .eq('id', userProfile.id);
    }

    onGameEnd(won);
  };

  const blueCount = gameState.territories.filter(t => t.owner === 'blue').length;
  const troopCardAmount = blueCount >= 20 ? 3 : 1;

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      {/* Header with Profiles */}
      <div className="flex items-center justify-between gap-4">
        {/* User Profile (Blu) */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
          gameState.currentPlayer === 'blue' 
            ? 'border-blue-500 bg-blue-500/10 shadow-lg scale-105' 
            : 'border-border/50 bg-background/50'
        }`}>
          <div className="relative">
            <img
              src={`https://tcmhvrlsaggyuukdscue.supabase.co/storage/v1/object/public/avatars/${userProfile?.avatar_url}`}
              alt={userProfile?.nickname}
              className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover"
            />
            {gameState.currentPlayer === 'blue' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-blue-500">{userProfile?.nickname}</p>
            <p className="text-xs text-muted-foreground">
              {gameState.territories.filter(t => t.owner === 'blue').length} territori
            </p>
          </div>
        </div>

        {/* VS and Timer */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-3xl font-bold">⚔️ VS ⚔️</div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            ⏱️ {gameState.turnTimeLeft}s
          </Badge>
        </div>

        {/* Opponent Profile (Rosso) */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
          gameState.currentPlayer === 'red' 
            ? 'border-red-500 bg-red-500/10 shadow-lg scale-105' 
            : 'border-border/50 bg-background/50'
        }`}>
          <div className="flex-1 text-right">
            <p className="font-bold text-red-500">{opponentProfile?.nickname}</p>
            <p className="text-xs text-muted-foreground">
              {gameState.territories.filter(t => t.owner === 'red').length} territori
            </p>
          </div>
          <div className="relative">
            <img
              src={`https://tcmhvrlsaggyuukdscue.supabase.co/storage/v1/object/public/avatars/${opponentProfile?.avatar_url}`}
              alt={opponentProfile?.nickname}
              className="w-12 h-12 rounded-full border-2 border-red-500 object-cover"
            />
            {gameState.currentPlayer === 'red' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Combat Animation */}
      {combatAnimation.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <Card className="p-6 bg-background/95 animate-scale-in">
            <p className="text-2xl font-bold text-center">{combatAnimation.message}</p>
          </Card>
        </div>
      )}

      {/* Cards */}
      {gameState.currentPlayer === 'blue' && !gameState.gameOver && (
        <div className="flex gap-2 justify-center flex-wrap">
          <Button
            variant={gameState.selectedCard === 'troops' ? 'default' : 'outline'}
            onClick={() => setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'troops' ? null : 'troops' }))}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            +{troopCardAmount} Truppe
          </Button>
          <Button
            variant={gameState.selectedCard === 'bomb' ? 'default' : 'outline'}
            onClick={() => setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'bomb' ? null : 'bomb' }))}
            disabled={gameState.cardCooldowns.bomb > 0}
            className="flex items-center gap-2"
          >
            <Plane className="w-4 h-4" />
            Bombardamento {gameState.cardCooldowns.bomb > 0 && `(${gameState.cardCooldowns.bomb})`}
          </Button>
          <Button
            variant={gameState.selectedCard === 'parachute' ? 'default' : 'outline'}
            onClick={() => setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'parachute' ? null : 'parachute' }))}
            disabled={gameState.cardCooldowns.parachute > 0}
            className="flex items-center gap-2"
          >
            🪂 Paracadutista {gameState.cardCooldowns.parachute > 0 && `(${gameState.cardCooldowns.parachute})`}
          </Button>
          <Button
            variant={gameState.selectedCard === 'force' ? 'default' : 'outline'}
            onClick={() => setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'force' ? null : 'force' }))}
            disabled={gameState.cardCooldowns.force > 0}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Forza {gameState.cardCooldowns.force > 0 && `(${gameState.cardCooldowns.force})`}
          </Button>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 min-h-0">
        <RisikoMap
          territories={gameState.territories}
          selectedTerritory={gameState.selectedTerritory}
          boostedTerritories={gameState.boostedTerritories}
          onTerritoryClick={handleTerritoryClick}
          disabled={gameState.currentPlayer !== 'blue' || gameState.gameOver}
          movingTroops={movingTroops}
        />
      </div>

      {/* Move Dialog */}
      <TroopMoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        maxTroops={gameState.territories.find(t => t.id === gameState.selectedTerritory)?.troops || 0}
        onConfirm={handleMoveTroops}
      />

      {/* Victory Dialog */}
      <RisikoVictoryDialog
        open={showVictory}
        winner={gameState.winner}
        userProfile={userProfile}
        onClose={() => setShowVictory(false)}
      />
    </div>
  );
};
