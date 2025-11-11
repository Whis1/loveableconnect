import { Territory } from "./territoryGenerator";

export type Player = 'blue' | 'red';

// Sistema di memoria dei turni
export interface TurnMemory {
  turnNumber: number;
  playerActions: PlayerAction[];
  territories: Territory[];
  outcome: 'win' | 'loss' | 'neutral';
}

export interface PlayerAction {
  type: 'attack' | 'move' | 'fortify' | 'card';
  fromTerritory?: string;
  toTerritory?: string;
  troops?: number;
  success?: boolean;
}

// Profilo del giocatore
export interface PlayerProfile {
  aggressiveness: number; // 0-1
  expansionTendency: number; // 0-1
  defensiveness: number; // 0-1
  favoriteRegions: string[];
  attackPatterns: string[];
}

// Analisi delle minacce
export interface ThreatAnalysis {
  territoryId: string;
  threatLevel: number;
  nearbyEnemyTroops: number;
  isStrategic: boolean;
  isChokepoint: boolean;
  zoneInfluence: number;
}

// Opportunità di attacco
export interface AttackOpportunity {
  attackerId: string;
  defenderId: string;
  attackerTroops: number;
  defenderTroops: number;
  successChance: number;
  strategicValue: number;
  continentalValue: number;
  monteCarloScore: number;
}

// Controllo continentale
export interface ContinentalControl {
  region: string;
  territories: string[];
  controlled: number;
  total: number;
  completionValue: number;
  isStrategic: boolean;
}

// Analisi momentum
export interface MomentumAnalysis {
  playerMomentum: number; // -1 a 1
  territoryTrend: number;
  troopTrend: number;
  turnsToVictory: number | null;
  turnsToDefeat: number | null;
}

export class AIMemorySystem {
  private turnHistory: TurnMemory[] = [];
  private playerProfile: PlayerProfile = {
    aggressiveness: 0.5,
    expansionTendency: 0.5,
    defensiveness: 0.5,
    favoriteRegions: [],
    attackPatterns: []
  };

  addTurn(memory: TurnMemory) {
    this.turnHistory.push(memory);
    if (this.turnHistory.length > 10) {
      this.turnHistory.shift();
    }
    this.updatePlayerProfile();
  }

  private updatePlayerProfile() {
    if (this.turnHistory.length < 3) return;

    const recentTurns = this.turnHistory.slice(-5);
    let attacks = 0;
    let moves = 0;
    let totalActions = 0;

    const regionFrequency: Record<string, number> = {};

    recentTurns.forEach(turn => {
      turn.playerActions.forEach(action => {
        totalActions++;
        if (action.type === 'attack') attacks++;
        if (action.type === 'move') moves++;
        if (action.fromTerritory) {
          regionFrequency[action.fromTerritory] = (regionFrequency[action.fromTerritory] || 0) + 1;
        }
      });
    });

    if (totalActions > 0) {
      this.playerProfile.aggressiveness = attacks / totalActions;
      this.playerProfile.expansionTendency = moves / totalActions;
      this.playerProfile.defensiveness = 1 - this.playerProfile.aggressiveness;
    }

    this.playerProfile.favoriteRegions = Object.entries(regionFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([region]) => region);
  }

  predictPlayerMove(territories: Territory[]): { likelyTargets: string[], confidence: number } {
    if (this.turnHistory.length < 2) {
      return { likelyTargets: [], confidence: 0 };
    }

    const recentActions = this.turnHistory
      .slice(-3)
      .flatMap(t => t.playerActions)
      .filter(a => a.type === 'attack');

    if (recentActions.length === 0) {
      return { likelyTargets: [], confidence: 0 };
    }

    const targetFrequency: Record<string, number> = {};
    recentActions.forEach(action => {
      if (action.toTerritory) {
        targetFrequency[action.toTerritory] = (targetFrequency[action.toTerritory] || 0) + 1;
      }
    });

    const likelyTargets = Object.entries(targetFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([target]) => target);

    const confidence = Math.min(0.9, (this.turnHistory.length / 10) * 0.7);

    return { likelyTargets, confidence };
  }

  getPlayerProfile(): PlayerProfile {
    return { ...this.playerProfile };
  }

  getTurnHistory(): TurnMemory[] {
    return [...this.turnHistory];
  }
}

// Sistema di simulazione Monte Carlo
export class MonteCarloSimulator {
  static simulateBattle(attackerTroops: number, defenderTroops: number, simulations: number = 1000): number {
    let wins = 0;

    for (let i = 0; i < simulations; i++) {
      let aTroops = attackerTroops;
      let dTroops = defenderTroops;

      while (aTroops > 0 && dTroops > 0) {
        const attackDice = Math.min(3, aTroops);
        const defendDice = Math.min(2, dTroops);

        const attackRolls = Array.from({ length: attackDice }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
        const defendRolls = Array.from({ length: defendDice }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);

        for (let j = 0; j < Math.min(attackRolls.length, defendRolls.length); j++) {
          if (attackRolls[j] > defendRolls[j]) {
            dTroops--;
          } else {
            aTroops--;
          }
        }
      }

      if (dTroops === 0) wins++;
    }

    return wins / simulations;
  }

  static evaluateAttackSequence(
    attacks: AttackOpportunity[],
    territories: Territory[],
    simulations: number = 500
  ): number {
    let totalScore = 0;

    for (let i = 0; i < simulations; i++) {
      let simulatedTerritories = territories.map(t => ({ ...t }));
      let sequenceSuccess = true;

      for (const attack of attacks) {
        const attacker = simulatedTerritories.find(t => t.id === attack.attackerId);
        const defender = simulatedTerritories.find(t => t.id === attack.defenderId);

        if (!attacker || !defender || attacker.troops < 2) {
          sequenceSuccess = false;
          break;
        }

        const battleResult = this.simulateBattle(attacker.troops - 1, defender.troops, 100);
        if (battleResult > 0.5) {
          defender.owner = 'red';
          defender.troops = Math.floor((attacker.troops - 1) * 0.6);
          attacker.troops = 1;
        } else {
          attacker.troops = Math.max(1, Math.floor(attacker.troops * 0.4));
          sequenceSuccess = false;
          break;
        }
      }

      if (sequenceSuccess) totalScore += 1;
    }

    return totalScore / simulations;
  }
}

// Analisi territoriale avanzata
export class TerritorialAnalyzer {
  static identifyContinents(territories: Territory[]): ContinentalControl[] {
    // Definizione manuale dei continenti basata sulla mappa
    const continents: Record<string, string[]> = {
      'Nord': ['Piana Verde', 'Arcipelago Nord', 'Lago Cristallo', 'Terre Ghiacciate'],
      'Est': ['Deserto Est', 'Canyon Rosso', 'Oasi Nascosta'],
      'Ovest': ['Foresta Ovest', 'Porto Abbandonato', 'Baia Serena'],
      'Sud': ['Montagne Sud', 'Valle Profonda', 'Zona Contaminata'],
      'Centro': ['Castello Antico', 'Rovine Misteriose', 'Città Fantasma', 'Tempio Sacro']
    };

    const controls: ContinentalControl[] = [];

    Object.entries(continents).forEach(([region, territoryNames]) => {
      const regionTerritories = territories.filter(t => territoryNames.includes(t.name));
      const controlledByRed = regionTerritories.filter(t => t.owner === 'red').length;
      const controlledByBlue = regionTerritories.filter(t => t.owner === 'blue').length;

      const completionValue = controlledByRed / territoryNames.length;
      const isStrategic = completionValue > 0.5 || controlledByBlue === 0;

      controls.push({
        region,
        territories: territoryNames,
        controlled: controlledByRed,
        total: territoryNames.length,
        completionValue,
        isStrategic
      });
    });

    return controls.sort((a, b) => b.completionValue - a.completionValue);
  }

  static identifyChokepoints(territory: Territory, allTerritories: Territory[]): boolean {
    // Un chokepoint è un territorio che connette due o più regioni separate
    if (territory.neighbors.length < 3) return false;

    const neighborOwners = territory.neighbors
      .map(nId => allTerritories.find(t => t.id === nId))
      .filter(t => t)
      .map(t => t!.owner);

    const uniqueOwners = new Set(neighborOwners);
    return uniqueOwners.size >= 2 && territory.neighbors.length >= 4;
  }

  static calculateZoneInfluence(
    territory: Territory,
    allTerritories: Territory[],
    depth: number = 2
  ): number {
    let influence = 0;
    const visited = new Set<string>();
    const queue: { id: string; dist: number }[] = [{ id: territory.id, dist: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.id) || current.dist > depth) continue;
      visited.add(current.id);

      const currentTerr = allTerritories.find(t => t.id === current.id);
      if (!currentTerr) continue;

      const weight = 1 / (current.dist + 1);
      if (currentTerr.owner === 'red') {
        influence += currentTerr.troops * weight;
      } else if (currentTerr.owner === 'blue') {
        influence -= currentTerr.troops * weight;
      }

      currentTerr.neighbors.forEach(nId => {
        if (!visited.has(nId)) {
          queue.push({ id: nId, dist: current.dist + 1 });
        }
      });
    }

    return influence;
  }

  static findStrategicPath(
    from: string,
    to: string,
    territories: Territory[],
    owner: Player
  ): string[] | null {
    const queue: { id: string; path: string[] }[] = [{ id: from, path: [from] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.id === to) return current.path;
      if (visited.has(current.id)) continue;
      visited.add(current.id);

      const territory = territories.find(t => t.id === current.id);
      if (!territory) continue;

      territory.neighbors.forEach(nId => {
        const neighbor = territories.find(t => t.id === nId);
        if (!neighbor || visited.has(nId)) return;
        if (neighbor.owner === owner || !neighbor.owner) {
          queue.push({ id: nId, path: [...current.path, nId] });
        }
      });
    }

    return null;
  }
}

// Analisi momentum e win conditions
export class GameStateAnalyzer {
  static analyzeMomentum(
    currentTerritories: Territory[],
    memorySystem: AIMemorySystem
  ): MomentumAnalysis {
    const history = memorySystem.getTurnHistory();
    
    if (history.length < 2) {
      return {
        playerMomentum: 0,
        territoryTrend: 0,
        troopTrend: 0,
        turnsToVictory: null,
        turnsToDefeat: null
      };
    }

    const recent = history.slice(-3);
    const blueTerritories = currentTerritories.filter(t => t.owner === 'blue');
    const redTerritories = currentTerritories.filter(t => t.owner === 'red');

    // Trend territori
    const oldBlueTerr = recent[0].territories.filter(t => t.owner === 'blue').length;
    const newBlueTerr = blueTerritories.length;
    const territoryTrend = (newBlueTerr - oldBlueTerr) / Math.max(1, oldBlueTerr);

    // Trend truppe
    const oldBlueTroops = recent[0].territories.filter(t => t.owner === 'blue').reduce((sum, t) => sum + t.troops, 0);
    const newBlueTroops = blueTerritories.reduce((sum, t) => sum + t.troops, 0);
    const troopTrend = (newBlueTroops - oldBlueTroops) / Math.max(1, oldBlueTroops);

    const playerMomentum = (territoryTrend + troopTrend) / 2;

    // Stima turni alla vittoria/sconfitta
    const totalTerritories = currentTerritories.length;
    const blueCount = blueTerritories.length;
    const redCount = redTerritories.length;

    let turnsToVictory: number | null = null;
    let turnsToDefeat: number | null = null;

    if (Math.abs(territoryTrend) > 0.01) {
      const turnsNeeded = (totalTerritories - blueCount) / Math.abs(territoryTrend * blueCount);
      if (territoryTrend < 0) {
        turnsToDefeat = Math.round(turnsNeeded);
      } else {
        turnsToVictory = Math.round(turnsNeeded);
      }
    }

    return {
      playerMomentum,
      territoryTrend,
      troopTrend,
      turnsToVictory,
      turnsToDefeat
    };
  }

  static identifyPressurePoints(
    territories: Territory[],
    owner: Player
  ): Territory[] {
    const myTerritories = territories.filter(t => t.owner === owner);
    const enemyOwner = owner === 'blue' ? 'red' : 'blue';

    const pressurePoints = myTerritories.filter(territory => {
      // Conta quanti territori nemici forti sono adiacenti
      const strongEnemies = territory.neighbors.filter(nId => {
        const neighbor = territories.find(t => t.id === nId);
        return neighbor && neighbor.owner === enemyOwner && neighbor.troops >= territory.troops;
      });

      // È un pressure point se ci sono 2+ nemici forti o se è un chokepoint
      return strongEnemies.length >= 2 || TerritorialAnalyzer.identifyChokepoints(territory, territories);
    });

    return pressurePoints.sort((a, b) => b.neighbors.length - a.neighbors.length);
  }

  static calculateRiskLevel(territories: Territory[]): number {
    const redTerritories = territories.filter(t => t.owner === 'red');
    const blueTerritories = territories.filter(t => t.owner === 'blue');

    if (redTerritories.length === 0) return 1; // Massimo rischio
    if (blueTerritories.length === 0) return 0; // Nessun rischio

    const redTroops = redTerritories.reduce((sum, t) => sum + t.troops, 0);
    const blueTroops = blueTerritories.reduce((sum, t) => sum + t.troops, 0);

    const territoryRatio = blueTerritories.length / territories.length;
    const troopRatio = blueTroops / (redTroops + blueTroops);

    return Math.min(1, (territoryRatio * 0.6 + troopRatio * 0.4));
  }
}
