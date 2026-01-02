import { Territory } from "./territoryGenerator";
import { GameState, PlayerPlan, PlannedTroopAssignment, PlannedTroopMovement, PlannedCardUsage, TROOPS_PER_ROUND, MAX_PLATOONS, createEmptyPlan } from "./types";
import { canMoveTroops } from "./risikoLogic";

/**
 * AI planning for simultaneous turns system.
 * The AI plans all actions at once: troop assignments, movements, and card usage.
 */
export const aiPlanTurn = (gameState: GameState): PlayerPlan => {
  const plan = createEmptyPlan();
  const myTerritories = gameState.territories.filter(t => t.owner === 'red');
  const enemyTerritories = gameState.territories.filter(t => t.owner === 'blue');
  
  if (myTerritories.length === 0) return plan;

  // 1. MANDATORY: Assign 6 troops
  plan.troopAssignments = planTroopAssignments(gameState, myTerritories, enemyTerritories);

  // 2. OPTIONAL: Plan movements (max 3 platoons/destinations)
  plan.troopMovements = planTroopMovements(gameState, myTerritories, enemyTerritories);

  // 3. OPTIONAL: Plan card usage
  plan.cardUsage = planCardUsage(gameState, myTerritories, enemyTerritories);

  return plan;
};

/**
 * Plan where to assign the 6 mandatory troops
 */
const planTroopAssignments = (
  gameState: GameState,
  myTerritories: Territory[],
  enemyTerritories: Territory[]
): PlannedTroopAssignment[] => {
  const assignments: PlannedTroopAssignment[] = [];
  let remainingTroops = TROOPS_PER_ROUND;

  // Analyze threats - territories with strong enemy neighbors
  const threatenedTerritories = myTerritories
    .map(territory => {
      let threatLevel = 0;
      territory.neighbors.forEach(nId => {
        const neighbor = gameState.territories.find(t => t.id === nId);
        if (neighbor && neighbor.owner === 'blue') {
          threatLevel += neighbor.troops;
          if (neighbor.troops > territory.troops) {
            threatLevel += (neighbor.troops - territory.troops) * 2;
          }
        }
      });
      return { territory, threatLevel };
    })
    .filter(t => t.threatLevel > 0)
    .sort((a, b) => b.threatLevel - a.threatLevel);

  // Find frontline territories (adjacent to enemies)
  const frontlineTerritories = myTerritories.filter(t =>
    t.neighbors.some(nId => {
      const n = gameState.territories.find(x => x.id === nId);
      return n && n.owner === 'blue';
    })
  );

  // Strategy: Distribute troops to most threatened territories
  if (threatenedTerritories.length > 0) {
    // Give more to the most threatened
    const primaryTarget = threatenedTerritories[0].territory;
    const primaryAmount = Math.min(3, remainingTroops);
    assignments.push({ territoryId: primaryTarget.id, amount: primaryAmount });
    remainingTroops -= primaryAmount;

    // Spread remaining to other threatened territories
    for (let i = 1; i < threatenedTerritories.length && remainingTroops > 0; i++) {
      const amount = Math.min(2, remainingTroops);
      assignments.push({ territoryId: threatenedTerritories[i].territory.id, amount });
      remainingTroops -= amount;
    }
  }

  // If still have troops, assign to frontline
  if (remainingTroops > 0 && frontlineTerritories.length > 0) {
    const target = frontlineTerritories[Math.floor(Math.random() * frontlineTerritories.length)];
    const existing = assignments.find(a => a.territoryId === target.id);
    if (existing) {
      existing.amount += remainingTroops;
    } else {
      assignments.push({ territoryId: target.id, amount: remainingTroops });
    }
    remainingTroops = 0;
  }

  // If still have troops, assign to random territory
  if (remainingTroops > 0) {
    const target = myTerritories[Math.floor(Math.random() * myTerritories.length)];
    const existing = assignments.find(a => a.territoryId === target.id);
    if (existing) {
      existing.amount += remainingTroops;
    } else {
      assignments.push({ territoryId: target.id, amount: remainingTroops });
    }
  }

  return assignments;
};

/**
 * Plan troop movements (max 3 destinations)
 */
const planTroopMovements = (
  gameState: GameState,
  myTerritories: Territory[],
  enemyTerritories: Territory[]
): PlannedTroopMovement[] => {
  const movements: PlannedTroopMovement[] = [];
  const usedDestinations = new Set<string>();

  // Find territories with excess troops in the rear
  const rearTerritories = myTerritories
    .filter(t => {
      const hasEnemyNeighbor = t.neighbors.some(nId => {
        const n = gameState.territories.find(x => x.id === nId);
        return n && n.owner === 'blue';
      });
      return !hasEnemyNeighbor && t.troops > 2;
    })
    .sort((a, b) => b.troops - a.troops);

  // Find frontline territories that could use reinforcements
  const frontlineTerritories = myTerritories
    .filter(t => t.neighbors.some(nId => {
      const n = gameState.territories.find(x => x.id === nId);
      return n && n.owner === 'blue';
    }))
    .sort((a, b) => a.troops - b.troops); // Weakest first

  // Move troops from rear to front
  for (const source of rearTerritories) {
    if (usedDestinations.size >= MAX_PLATOONS) break;

    for (const target of frontlineTerritories) {
      if (usedDestinations.has(target.id)) continue;
      if (!canMoveTroops(source, target, gameState.territories)) continue;

      const troopsToMove = Math.floor(source.troops / 2);
      if (troopsToMove >= 1) {
        movements.push({
          fromId: source.id,
          toId: target.id,
          amount: troopsToMove
        });
        usedDestinations.add(target.id);
        break;
      }
    }
  }

  return movements;
};

/**
 * Plan card usage
 */
const planCardUsage = (
  gameState: GameState,
  myTerritories: Territory[],
  enemyTerritories: Territory[]
): PlannedCardUsage | null => {
  const cooldowns = gameState.cardCooldowns.red;

  // Try to use bomb on strong enemy territory
  if (cooldowns.bomb === 0 && enemyTerritories.length > 0) {
    const strongestEnemy = [...enemyTerritories].sort((a, b) => b.troops - a.troops)[0];
    if (strongestEnemy.troops >= 4) {
      return {
        cardType: 'bomb',
        targetTerritoryId: strongestEnemy.id
      };
    }
  }

  // Try to use parachute on weak enemy territory
  if (cooldowns.parachute === 0 && enemyTerritories.length > 0) {
    const weakEnemy = enemyTerritories.find(t => t.troops === 1);
    if (weakEnemy) {
      return {
        cardType: 'parachute',
        targetTerritoryId: weakEnemy.id
      };
    }
  }

  // Try to use force on frontline territory
  if (cooldowns.force === 0) {
    const frontline = myTerritories.find(t => 
      t.troops >= 3 && 
      t.neighbors.some(nId => {
        const n = gameState.territories.find(x => x.id === nId);
        return n && n.owner === 'blue';
      })
    );
    if (frontline) {
      return {
        cardType: 'force',
        targetTerritoryId: frontline.id
      };
    }
  }

  // Use reinforcement on weakest frontline
  const weakestFrontline = myTerritories
    .filter(t => t.neighbors.some(nId => {
      const n = gameState.territories.find(x => x.id === nId);
      return n && n.owner === 'blue';
    }))
    .sort((a, b) => a.troops - b.troops)[0];

  if (weakestFrontline) {
    return {
      cardType: 'reinforcement',
      targetTerritoryId: weakestFrontline.id
    };
  }

  return null;
};
