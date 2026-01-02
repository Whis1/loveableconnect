import { Territory } from "./territoryGenerator";

export type Player = 'blue' | 'red';
export type CardType = 'reinforcement' | 'bomb' | 'parachute' | 'force';
export type GamePhase = 'planning' | 'resolving' | 'waiting';

export interface PlannedTroopAssignment {
  territoryId: string;
  amount: number;
}

export interface PlannedTroopMovement {
  fromId: string;
  toId: string;
  amount: number;
}

export interface PlannedCardUsage {
  cardType: CardType;
  targetTerritoryId: string;
}

export interface PlayerPlan {
  troopAssignments: PlannedTroopAssignment[];
  troopMovements: PlannedTroopMovement[]; // Max 3 platoons
  cardUsage: PlannedCardUsage | null;
}

export interface GameState {
  territories: Territory[];
  roundNumber: number;
  phase: GamePhase;
  
  // Troops to assign each round (6 mandatory)
  troopsToAssign: {
    blue: number;
    red: number;
  };
  
  // Planned actions for current round
  playerPlans: {
    blue: PlayerPlan;
    red: PlayerPlan;
  };
  
  // Ready status
  readyStatus: {
    blue: boolean;
    red: boolean;
  };
  
  // Who goes first in resolution (alternates each round)
  resolutionFirstPlayer: Player;
  
  // Card cooldowns
  cardCooldowns: {
    blue: {
      bomb: number;
      parachute: number;
      force: number;
    };
    red: {
      bomb: number;
      parachute: number;
      force: number;
    };
  };
  
  boostedTroops: Record<string, number>;
  gameOver: boolean;
  winner: Player | null;
  
  // For resolution animation tracking
  resolutionStep: number;
  currentResolutionPlayer: Player | null;
}

export const createEmptyPlan = (): PlayerPlan => ({
  troopAssignments: [],
  troopMovements: [],
  cardUsage: null
});

export const getTotalAssignedTroops = (plan: PlayerPlan): number => {
  return plan.troopAssignments.reduce((sum, a) => sum + a.amount, 0);
};

export const getMovementCount = (plan: PlayerPlan): number => {
  // Count unique destinations (max 3)
  const destinations = new Set(plan.troopMovements.map(m => m.toId));
  return destinations.size;
};

export const TROOPS_PER_ROUND = 6;
export const MAX_PLATOONS = 3;
