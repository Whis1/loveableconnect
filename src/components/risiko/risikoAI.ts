import { Territory } from "./territoryGenerator";
import { canMoveTroops, simulateBattle, findPath } from "./risikoLogic";
import {
  AIMemorySystem,
  MonteCarloSimulator,
  TerritorialAnalyzer,
  GameStateAnalyzer,
  ThreatAnalysis,
  AttackOpportunity,
  MomentumAnalysis,
  PlayerAction,
  ContinentalControl
} from "./risikoAICore";

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
  boostedTroops: Record<string, number>;
  gameOver: boolean;
  winner: Player | null;
}

// Sistema di memoria globale per l'AI
const aiMemory = new AIMemorySystem();
let turnCounter = 0;

export const aiMakeMove = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  handleCombat: (attackerId: string, defenderId: string, attackerTroops: number) => void,
  showAnimation: (message: string) => void,
  opponentNickname: string
) => {
  turnCounter++;
  
  const myTerritories = gameState.territories.filter(t => t.owner === 'red');
  const enemyTerritories = gameState.territories.filter(t => t.owner === 'blue');
  const neutralTerritories = gameState.territories.filter(t => !t.owner);

  // 🧠 ANALISI COMPLETA DELLA SITUAZIONE
  const momentum = GameStateAnalyzer.analyzeMomentum(gameState.territories, aiMemory);
  const riskLevel = GameStateAnalyzer.calculateRiskLevel(gameState.territories);
  const continents = TerritorialAnalyzer.identifyContinents(gameState.territories);
  const pressurePoints = GameStateAnalyzer.identifyPressurePoints(gameState.territories, 'red');
  const playerPrediction = aiMemory.predictPlayerMove(gameState.territories);
  const threats = analyzeThreatLevel(gameState, myTerritories, enemyTerritories);
  const attackOpportunities = findAttackOpportunities(gameState, myTerritories, enemyTerritories);

  console.log('🎯 AI Strategic Analysis:', {
    turn: turnCounter,
    momentum: momentum.playerMomentum.toFixed(2),
    riskLevel: riskLevel.toFixed(2),
    turnsToDefeat: momentum.turnsToDefeat,
    predictedTargets: playerPrediction.likelyTargets.slice(0, 2),
    pressurePoints: pressurePoints.length,
    bestContinent: continents[0]?.region
  });

  // 🚨 FASE 1: RISPOSTA EMERGENZA (se rischio critico)
  if (riskLevel > 0.7 || (momentum.turnsToDefeat && momentum.turnsToDefeat < 5)) {
    if (tryEmergencyDefense(gameState, setGameState, handleCombat, showAnimation, myTerritories, enemyTerritories, pressurePoints, opponentNickname)) {
      return;
    }
  }

  // 🎯 FASE 2: PREVISIONE E CONTRATTACCO
  if (playerPrediction.confidence > 0.5 && playerPrediction.likelyTargets.length > 0) {
    if (tryPreemptiveDefense(gameState, setGameState, showAnimation, playerPrediction, myTerritories, opponentNickname)) {
      return;
    }
  }

  // 🏆 FASE 3: CONTROLLO CONTINENTALE
  if (tryContinentalStrategy(gameState, setGameState, handleCombat, showAnimation, continents, myTerritories, enemyTerritories, attackOpportunities, opponentNickname)) {
    return;
  }

  // ⚔️ FASE 4: ATTACCO CON SIMULAZIONI MONTE CARLO
  if (tryMonteCarloAttack(gameState, setGameState, handleCombat, showAnimation, attackOpportunities, riskLevel, opponentNickname)) {
    return;
  }

  // 🏁 FASE 5: CONQUISTA OPPORTUNISTICA (priorità territori con 1-2 truppe)
  if (tryOpportunisticConquest(gameState, setGameState, handleCombat, showAnimation, attackOpportunities, opponentNickname)) {
    return;
  }

  // 🧱 FASE 6: ASSALTO PREPARATO (sposto truppe sul fronte e attacco subito)
  if (tryPreparedAssault(gameState, setGameState, handleCombat, showAnimation, myTerritories, opponentNickname)) {
    return;
  }

  // 🎴 FASE 7: USO CARTE STRATEGICO (tutte: bomba, paracadute, force, truppe)
  if (tryAllCardsStrategically(gameState, setGameState, showAnimation, handleCombat, myTerritories, enemyTerritories, threats, attackOpportunities, momentum, riskLevel, continents, opponentNickname)) {
    return;
  }

  // 🔄 FASE 8: SPOSTAMENTO TRUPPE TATTICO
  if (tryTacticalTroopMovement(gameState, setGameState, showAnimation, myTerritories, threats, pressurePoints, opponentNickname)) {
    return;
  }

  // 🛡️ FASE 7: FORTIFICAZIONE CHOKEPOINTS (solo territori critici)
  if (tryChokePointFortification(gameState, setGameState, showAnimation, myTerritories, opponentNickname)) {
    return;
  }

  // 🌍 FASE 8: ESPANSIONE CALCOLATA
  if (tryCalculatedExpansion(gameState, setGameState, myTerritories, neutralTerritories, enemyTerritories, riskLevel)) {
    return;
  }

  // 🔄 FASE 9: CONSOLIDAMENTO ZONE
  if (tryZoneConsolidation(gameState, setGameState, myTerritories, threats)) {
    return;
  }

  // 🎲 DEFAULT: AGGIUNGI TRUPPE (solo se nessuna altra strategia funziona)
  if (myTerritories.length > 0) {
    const strategic = findUltimateStrategicTerritory(myTerritories, threats, continents, pressurePoints);
    const redCount = myTerritories.length;
    const amount = redCount >= 20 ? 3 : 1;
    
    setGameState(prev => ({
      ...prev,
      territories: prev.territories.map(t => 
        t.id === strategic.id ? {...t, troops: t.troops + amount} : t
      )
    }));
    
    showAnimation(`${opponentNickname} ha aggiunto truppe`);
  }

  setTimeout(() => {
    setGameState(prev => ({
      ...prev,
      currentPlayer: 'blue',
      turnTimeLeft: 30,
      selectedTerritory: null,
      selectedCard: null
    }));
  }, 800);
};

// 🔍 ANALISI AVANZATA DELLE MINACCE
const analyzeThreatLevel = (
  gameState: GameState,
  myTerritories: Territory[],
  enemyTerritories: Territory[]
): ThreatAnalysis[] => {
  return myTerritories.map(territory => {
    let threatLevel = 0;
    let nearbyEnemyTroops = 0;
    
    territory.neighbors.forEach(nId => {
      const neighbor = gameState.territories.find(t => t.id === nId);
      if (neighbor && neighbor.owner === 'blue') {
        nearbyEnemyTroops += neighbor.troops;
        if (neighbor.troops > territory.troops) {
          threatLevel += (neighbor.troops - territory.troops) * 2;
        } else {
          threatLevel += neighbor.troops;
        }
      }
    });

    const isStrategic = territory.neighbors.length >= 4;
    const isChokepoint = TerritorialAnalyzer.identifyChokepoints(territory, gameState.territories);
    const zoneInfluence = TerritorialAnalyzer.calculateZoneInfluence(territory, gameState.territories);

    if (isStrategic) threatLevel *= 1.5;
    if (isChokepoint) threatLevel *= 2;

    return {
      territoryId: territory.id,
      threatLevel,
      nearbyEnemyTroops,
      isStrategic,
      isChokepoint,
      zoneInfluence
    };
  });
};

// 🎯 TROVA OPPORTUNITÀ CON VALORE CONTINENTALE E MONTE CARLO
const findAttackOpportunities = (
  gameState: GameState,
  myTerritories: Territory[],
  enemyTerritories: Territory[]
): AttackOpportunity[] => {
  const opportunities: AttackOpportunity[] = [];
  const continents = TerritorialAnalyzer.identifyContinents(gameState.territories);

  myTerritories.forEach(myTerritory => {
    if (myTerritory.troops < 3) return;

    myTerritory.neighbors.forEach(nId => {
      const enemy = gameState.territories.find(t => t.id === nId && t.owner === 'blue');
      if (!enemy) return;

      const attackerTroops = myTerritory.troops - 1;
      const successChance = calculateSuccessChance(attackerTroops, enemy.troops);
      
      let strategicValue = enemy.neighbors.length * 2;
      
      // Valore continentale
      let continentalValue = 0;
      continents.forEach(continent => {
        if (continent.territories.includes(enemy.name)) {
          continentalValue = continent.completionValue * 10;
        }
      });

      const wouldIsolate = enemy.neighbors.filter(nnId => {
        const nn = gameState.territories.find(t => t.id === nnId);
        return nn && nn.owner === 'blue' && nn.id !== enemy.id;
      }).length === 0;
      if (wouldIsolate) strategicValue += 10;

      const isChokepoint = TerritorialAnalyzer.identifyChokepoints(enemy, gameState.territories);
      if (isChokepoint) strategicValue += 15;

      // Simulazione Monte Carlo
      const monteCarloScore = MonteCarloSimulator.simulateBattle(attackerTroops, enemy.troops, 500);

      opportunities.push({
        attackerId: myTerritory.id,
        defenderId: enemy.id,
        attackerTroops,
        defenderTroops: enemy.troops,
        successChance,
        strategicValue,
        continentalValue,
        monteCarloScore
      });
    });
  });

  return opportunities.sort((a, b) => {
    const scoreA = a.monteCarloScore * (a.strategicValue + a.continentalValue);
    const scoreB = b.monteCarloScore * (b.strategicValue + b.continentalValue);
    return scoreB - scoreA;
  });
};

const calculateSuccessChance = (attackerTroops: number, defenderTroops: number): number => {
  if (attackerTroops <= defenderTroops) return 0;
  const advantage = attackerTroops - defenderTroops;
  return Math.min(0.95, 0.5 + (advantage * 0.15));
};

// Helper: restituisce il prossimo passo adiacente verso il target, senza teletrasporti
const getAdjacentStep = (
  fromId: string,
  toId: string,
  territories: Territory[],
  owner: Player
): string | null => {
  const from = territories.find(t => t.id === fromId);
  const to = territories.find(t => t.id === toId);
  if (!from || !to) return null;
  if (canMoveTroops(from, to, territories)) return to.id;
  const path = findPath(fromId, toId, territories, owner);
  if (!path || path.length < 2) return null;
  return path[1]; // fai un solo passo
};

// 🚨 DIFESA EMERGENZA
const tryEmergencyDefense = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  handleCombat: (attackerId: string, defenderId: string, attackerTroops: number) => void,
  showAnimation: (message: string) => void,
  myTerritories: Territory[],
  enemyTerritories: Territory[],
  pressurePoints: Territory[],
  opponentNickname: string
): boolean => {
  if (pressurePoints.length === 0) return false;

  // Usa la bomba su minacce immediate
  if (gameState.cardCooldowns.bomb === 0) {
    const mostThreatened = pressurePoints[0];
    const strongestThreat = mostThreatened.neighbors
      .map(nId => gameState.territories.find(t => t.id === nId))
      .filter(t => t && t.owner === 'blue')
      .sort((a, b) => b!.troops - a!.troops)[0];

    if (strongestThreat && strongestThreat.troops >= 3) {
      showAnimation(`${opponentNickname} ha usato la bomba`);
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => {
          if (t.id === strongestThreat.id) {
            const newTroops = Math.max(0, t.troops - 2);
            return {...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner};
          }
          return t;
        }),
        cardCooldowns: {...prev.cardCooldowns, bomb: 5}
      }));
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 1500);
      
      return true;
    }
  }

  // Consolida truppe verso il punto sotto pressione
  const reinforcements = myTerritories.filter(t => {
    return !pressurePoints.some(pp => pp.id === t.id) && t.troops >= 3;
  }).sort((a, b) => b.troops - a.troops);

  if (reinforcements.length > 0 && pressurePoints.length > 0) {
    const source = reinforcements[0];
    const target = pressurePoints[0];
    const moveTroops = Math.floor(source.troops / 2);

    // Muovi solo di un passo verso il target (no salti di continente)
    const stepId = getAdjacentStep(source.id, target.id, gameState.territories, 'red');
    if (!stepId) return false;
    const step = gameState.territories.find(t => t.id === stepId);
    if (!step || (step.owner && step.owner !== 'red')) return false;

    showAnimation(`${opponentNickname} sta spostando truppe`);

    setGameState(prev => ({
      ...prev,
      territories: prev.territories.map(t => {
        if (t.id === source.id) {
          return {...t, troops: t.troops - moveTroops};
        }
        if (t.id === stepId) {
          return {...t, troops: t.troops + moveTroops};
        }
        return t;
      })
    }));

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: 'blue',
        turnTimeLeft: 30
      }));
    }, 800);

    return true;
  }

  return false;
};

// 🎯 DIFESA PREVENTIVA
const tryPreemptiveDefense = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  showAnimation: (message: string) => void,
  playerPrediction: { likelyTargets: string[], confidence: number },
  myTerritories: Territory[],
  opponentNickname: string
): boolean => {
  const predictedTarget = myTerritories.find(t => 
    playerPrediction.likelyTargets.includes(t.id)
  );

  if (!predictedTarget || predictedTarget.troops >= 5) return false;

  const nearbyAllies = predictedTarget.neighbors
    .map(nId => gameState.territories.find(t => t.id === nId))
    .filter(t => t && t.owner === 'red' && t.troops >= 3) as Territory[];

  if (nearbyAllies.length > 0) {
    const source = nearbyAllies.sort((a, b) => b.troops - a.troops)[0];
    const moveTroops = Math.floor(source.troops / 2);

    showAnimation(`${opponentNickname} sta spostando truppe`);

    setGameState(prev => ({
      ...prev,
      territories: prev.territories.map(t => {
        if (t.id === source.id) {
          return {...t, troops: t.troops - moveTroops};
        }
        if (t.id === predictedTarget.id) {
          return {...t, troops: t.troops + moveTroops};
        }
        return t;
      })
    }));

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: 'blue',
        turnTimeLeft: 30
      }));
    }, 800);

    return true;
  }

  return false;
};

// 🏆 STRATEGIA CONTINENTALE
const tryContinentalStrategy = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  handleCombat: (attackerId: string, defenderId: string, attackerTroops: number) => void,
  showAnimation: (message: string) => void,
  continents: ContinentalControl[],
  myTerritories: Territory[],
  enemyTerritories: Territory[],
  attackOpportunities: AttackOpportunity[],
  opponentNickname: string
): boolean => {
  // Cerca continenti quasi completati
  const nearComplete = continents.find(c => c.completionValue >= 0.6 && c.completionValue < 1);

  if (nearComplete) {
    // Trova territori nemici in quel continente
    const enemyInContinent = enemyTerritories.filter(t => 
      nearComplete.territories.includes(t.name)
    );

    if (enemyInContinent.length > 0) {
      // Trova attacchi verso questi territori
      const continentalAttacks = attackOpportunities.filter(opp => {
        const defender = gameState.territories.find(t => t.id === opp.defenderId);
        return defender && nearComplete.territories.includes(defender.name);
      });

      if (continentalAttacks.length > 0 && continentalAttacks[0].monteCarloScore >= 0.65) {
        const attack = continentalAttacks[0];
        showAnimation(`${opponentNickname} sta attaccando`);
        
        setTimeout(() => {
          handleCombat(attack.attackerId, attack.defenderId, attack.attackerTroops);
        }, 500);
        
        return true;
      }
    }
  }

  return false;
};

// 🎴 USO STRATEGICO DI TUTTE LE CARTE
const tryAllCardsStrategically = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  showAnimation: (message: string) => void,
  handleCombat: (attackerId: string, defenderId: string, attackerTroops: number) => void,
  myTerritories: Territory[],
  enemyTerritories: Territory[],
  threats: ThreatAnalysis[],
  attackOpportunities: AttackOpportunity[],
  momentum: MomentumAnalysis,
  riskLevel: number,
  continents: ContinentalControl[],
  opponentNickname: string
): boolean => {
  // Valuta quale carta usare in base alla situazione
  const cardScores = {
    force: 0,
    bomb: 0,
    parachute: 0,
    troops: 0
  };

  // FORCE: Alto valore se c'è un attacco eccellente disponibile
  if (gameState.cardCooldowns.force === 0 && attackOpportunities.length > 0) {
    const excellentAttack = attackOpportunities.find(opp => 
      opp.monteCarloScore >= 0.75 && (opp.strategicValue + opp.continentalValue) >= 10
    );
    if (excellentAttack) cardScores.force = 100;
  }

  // BOMBA: Alto valore se ci sono minacce concentrate
  if (gameState.cardCooldowns.bomb === 0 && enemyTerritories.length > 0) {
    const dangerousEnemies = enemyTerritories.filter(t => t.troops >= 4);
    if (dangerousEnemies.length > 0) {
      const maxThreat = Math.max(...dangerousEnemies.map(t => {
        const adjacentRed = t.neighbors.filter(nId => {
          const n = gameState.territories.find(ter => ter.id === nId);
          return n && n.owner === 'red';
        }).length;
        return adjacentRed * t.troops;
      }));
      if (maxThreat >= 12) cardScores.bomb = 90;
    }
  }

  // PARACADUTE: Alto valore se ci sono obiettivi strategici con 1 truppa
  if (gameState.cardCooldowns.parachute === 0) {
    const strategicTargets = enemyTerritories.filter(t => t.troops === 1).length;
    const massiveTargets = enemyTerritories.filter(t => t.troops >= 5).length;
    if (strategicTargets > 0) cardScores.parachute = 85;
    else if (massiveTargets > 0) cardScores.parachute = 70;
  }

  // TRUPPE: Valore basato su situazione difensiva e continentale
  const criticalTerritories = threats.filter(t => t.threatLevel > 8 || t.isChokepoint).length;
  const almostCompleteContinents = continents.filter(c => c.completionValue >= 0.7 && c.completionValue < 1).length;
  
  if (criticalTerritories > 0) cardScores.troops = 60 + (criticalTerritories * 5);
  if (almostCompleteContinents > 0) cardScores.troops += 20;
  if (riskLevel > 0.6) cardScores.troops += 15;

  // Usa la carta con punteggio più alto
  const bestCard = Object.entries(cardScores).reduce((max, [card, score]) => 
    score > max.score ? { card, score } : max
  , { card: '', score: 0 });

  if (bestCard.score === 0) return false;

  // Esegui l'azione della carta migliore
  // FORZA: Usa con attacco strategico eccellente
  if (gameState.cardCooldowns.force === 0 && attackOpportunities.length > 0) {
    const excellentAttack = attackOpportunities.find(opp => 
      opp.monteCarloScore >= 0.75 && (opp.strategicValue + opp.continentalValue) >= 10
    );

    if (excellentAttack) {
      const attacker = gameState.territories.find(t => t.id === excellentAttack.attackerId);
      const defender = gameState.territories.find(t => t.id === excellentAttack.defenderId);

      if (attacker && defender) {
        showAnimation(`${opponentNickname} ha usato la forza`);
        
        setGameState(prev => ({
          ...prev,
          boostedTroops: {
            ...prev.boostedTroops,
            [attacker.id]: attacker.troops
          },
          cardCooldowns: {...prev.cardCooldowns, force: 4}
        }));

        setTimeout(() => {
          handleCombat(attacker.id, defender.id, attacker.troops - 1);
        }, 800);

        return true;
      }
    }
  }

  // BOMBA: Usa su concentrazioni nemiche pericolose
  if (gameState.cardCooldowns.bomb === 0 && enemyTerritories.length > 0) {
    const dangerousEnemies = enemyTerritories
      .filter(t => t.troops >= 4)
      .map(t => {
        const adjacentMyTerritories = t.neighbors.filter(nId => {
          const neighbor = gameState.territories.find(ter => ter.id === nId);
          return neighbor && neighbor.owner === 'red';
        });
        return { territory: t, threat: adjacentMyTerritories.length * t.troops };
      })
      .sort((a, b) => b.threat - a.threat);

    if (dangerousEnemies.length > 0 && dangerousEnemies[0].threat >= 12) {
      const target = dangerousEnemies[0].territory;
      showAnimation(`${opponentNickname} ha usato la bomba`);
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => {
          if (t.id === target.id) {
            const newTroops = Math.max(0, t.troops - 2);
            return {...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner};
          }
          return t;
        }),
        cardCooldowns: {...prev.cardCooldowns, bomb: 5}
      }));
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 1500);
      
      return true;
    }
  }

  // PARACADUTE: Usa per blocchi strategici o conquiste rapide
  if (gameState.cardCooldowns.parachute === 0) {
    // Priorità: territori nemici singoli che bloccano espansioni
    const blockingEnemies = enemyTerritories.filter(t => {
      if (t.troops !== 1) return false;
      const myNeighbors = t.neighbors.filter(nId => {
        const n = gameState.territories.find(ter => ter.id === nId);
        return n && n.owner === 'red';
      });
      const enemyNeighbors = t.neighbors.filter(nId => {
        const n = gameState.territories.find(ter => ter.id === nId);
        return n && n.owner === 'blue';
      });
      return myNeighbors.length >= 2 && enemyNeighbors.length >= 2;
    });

    if (blockingEnemies.length > 0) {
      const target = blockingEnemies[0];
      showAnimation(`${opponentNickname} ha usato il paracadute`);
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => 
          t.id === target.id ? {...t, owner: 'red', troops: 1} : t
        ),
        cardCooldowns: {...prev.cardCooldowns, parachute: 3}
      }));
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 1500);
      
      return true;
    }

    // Kamikaze su concentrazioni massicce (5+ truppe)
    const massiveForces = enemyTerritories.filter(t => t.troops >= 5);
    if (massiveForces.length > 0) {
      const target = massiveForces.sort((a, b) => b.troops - a.troops)[0];
      showAnimation(`${opponentNickname} ha usato il paracadute`);
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => 
          t.id === target.id ? {...t, troops: t.troops - 1} : t
        ),
        cardCooldowns: {...prev.cardCooldowns, parachute: 3}
      }));
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 1500);
      
      return true;
    }
  }

  // ESECUZIONE CARTA FORCE
  if (bestCard.card === 'force' && gameState.cardCooldowns.force === 0) {
    const excellentAttack = attackOpportunities.find(opp => 
      opp.monteCarloScore >= 0.75 && (opp.strategicValue + opp.continentalValue) >= 10
    );

    if (excellentAttack) {
      const attacker = gameState.territories.find(t => t.id === excellentAttack.attackerId);
      const defender = gameState.territories.find(t => t.id === excellentAttack.defenderId);

      if (attacker && defender) {
        showAnimation(`${opponentNickname} ha usato la forza`);
        
        setGameState(prev => ({
          ...prev,
          boostedTroops: {
            ...prev.boostedTroops,
            [attacker.id]: attacker.troops
          },
          cardCooldowns: {...prev.cardCooldowns, force: 4}
        }));

        setTimeout(() => {
          handleCombat(attacker.id, defender.id, attacker.troops - 1);
        }, 800);

        return true;
      }
    }
  }

  // ESECUZIONE CARTA BOMBA
  if (bestCard.card === 'bomb' && gameState.cardCooldowns.bomb === 0) {
    const dangerousEnemies = enemyTerritories
      .filter(t => t.troops >= 4)
      .map(t => {
        const adjacentMyTerritories = t.neighbors.filter(nId => {
          const neighbor = gameState.territories.find(ter => ter.id === nId);
          return neighbor && neighbor.owner === 'red';
        });
        return { territory: t, threat: adjacentMyTerritories.length * t.troops };
      })
      .sort((a, b) => b.threat - a.threat);

    if (dangerousEnemies.length > 0 && dangerousEnemies[0].threat >= 12) {
      const target = dangerousEnemies[0].territory;
      showAnimation(`${opponentNickname} ha usato la bomba`);
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => {
          if (t.id === target.id) {
            const newTroops = Math.max(0, t.troops - 2);
            return {...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner};
          }
          return t;
        }),
        cardCooldowns: {...prev.cardCooldowns, bomb: 5}
      }));
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 1500);
      
      return true;
    }
  }

  // ESECUZIONE CARTA PARACADUTE
  if (bestCard.card === 'parachute' && gameState.cardCooldowns.parachute === 0) {
    const blockingEnemies = enemyTerritories.filter(t => {
      if (t.troops !== 1) return false;
      const myNeighbors = t.neighbors.filter(nId => {
        const n = gameState.territories.find(ter => ter.id === nId);
        return n && n.owner === 'red';
      });
      const enemyNeighbors = t.neighbors.filter(nId => {
        const n = gameState.territories.find(ter => ter.id === nId);
        return n && n.owner === 'blue';
      });
      return myNeighbors.length >= 2 && enemyNeighbors.length >= 1;
    });

    if (blockingEnemies.length > 0) {
      const target = blockingEnemies[0];
      showAnimation(`${opponentNickname} ha usato il paracadute`);
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => 
          t.id === target.id ? {...t, owner: 'red', troops: 1} : t
        ),
        cardCooldowns: {...prev.cardCooldowns, parachute: 3}
      }));
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 1500);
      
      return true;
    }

    const massiveForces = enemyTerritories.filter(t => t.troops >= 5);
    if (massiveForces.length > 0) {
      const target = massiveForces.sort((a, b) => b.troops - a.troops)[0];
      showAnimation(`${opponentNickname} ha usato il paracadute`);
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => 
          t.id === target.id ? {...t, troops: t.troops - 1} : t
        ),
        cardCooldowns: {...prev.cardCooldowns, parachute: 3}
      }));
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 1500);
      
      return true;
    }
  }

  // ESECUZIONE CARTA TRUPPE
  if (bestCard.card === 'troops' && myTerritories.length > 0) {
    // Trova il territorio più critico o strategico
    const criticalThreats = threats
      .filter(t => t.threatLevel > 8 || t.isChokepoint)
      .sort((a, b) => b.threatLevel - a.threatLevel);

    let targetTerritory: Territory | undefined;

    if (criticalThreats.length > 0) {
      targetTerritory = myTerritories.find(t => t.id === criticalThreats[0].territoryId);
    } else {
      // Cerca territorio in continente quasi completo
      const almostComplete = continents.find(c => c.completionValue >= 0.7 && c.completionValue < 1);
      if (almostComplete) {
        targetTerritory = myTerritories
          .filter(t => almostComplete.territories.includes(t.name))
          .sort((a, b) => b.neighbors.length - a.neighbors.length)[0];
      }
    }

    if (!targetTerritory) {
      targetTerritory = findUltimateStrategicTerritory(myTerritories, threats, continents, []);
    }

    const redCount = myTerritories.length;
    const amount = redCount >= 20 ? 3 : 1;
    
    setGameState(prev => ({
      ...prev,
      territories: prev.territories.map(t => 
        t.id === targetTerritory!.id ? {...t, troops: t.troops + amount} : t
      )
    }));
    
    showAnimation(`${opponentNickname} ha aggiunto truppe`);
    
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: 'blue',
        turnTimeLeft: 30
      }));
    }, 800);
    
    return true;
  }

  return false;
};

// 🔄 SPOSTAMENTO TRUPPE TATTICO
const tryTacticalTroopMovement = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  showAnimation: (message: string) => void,
  myTerritories: Territory[],
  threats: ThreatAnalysis[],
  pressurePoints: Territory[],
  opponentNickname: string
): boolean => {
  // Trova territori sotto pressione che necessitano rinforzi
  const underPressure = pressurePoints.filter(pp => {
    const threat = threats.find(t => t.territoryId === pp.id);
    return threat && threat.threatLevel > 6 && pp.troops < 5;
  });

  if (underPressure.length === 0) {
    // Fallback: rinforza il fronte (territorio rosso adiacente a nemici con poche truppe)
    const frontline = myTerritories
      .filter(t => t.neighbors.some(nId => {
        const n = gameState.territories.find(ter => ter.id === nId);
        return n && n.owner === 'blue';
      }))
      .sort((a, b) => a.troops - b.troops);

    if (frontline.length === 0) return false;

    const target = frontline[0];

    const safeSuppliers = myTerritories.filter(t => {
      const hasNoEnemyNeighbor = !t.neighbors.some(nId => {
        const n = gameState.territories.find(ter => ter.id === nId);
        return n && n.owner === 'blue';
      });
      return hasNoEnemyNeighbor && t.troops >= 4 && t.id !== target.id;
    }).sort((a, b) => b.troops - a.troops);

    if (safeSuppliers.length === 0) return false;

    const source = safeSuppliers[0];
    const moveTroops = Math.floor(source.troops * 0.4); // sposta 40% verso prima linea

    showAnimation(`${opponentNickname} sta spostando truppe`);

    setGameState(prev => ({
      ...prev,
      territories: prev.territories.map(t => {
        if (t.id === source.id) return { ...t, troops: t.troops - moveTroops };
        if (t.id === target.id) return { ...t, troops: t.troops + moveTroops };
        return t;
      })
    }));

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: 'blue',
        turnTimeLeft: 30
      }));
    }, 800);

    return true;
  }

  const target = underPressure[0];
  
  // Trova territori sicuri con truppe eccedenti
  const safeSuppliers = myTerritories.filter(t => {
    const hasNoEnemyNeighbor = !t.neighbors.some(nId => {
      const n = gameState.territories.find(ter => ter.id === nId);
      return n && n.owner === 'blue';
    });
    return hasNoEnemyNeighbor && t.troops >= 4 && t.id !== target.id;
  }).sort((a, b) => b.troops - a.troops);

  if (safeSuppliers.length > 0) {
    const source = safeSuppliers[0];
    const moveTroops = Math.floor(source.troops * 0.6); // Sposta 60% delle truppe

    // Muovi solo di un passo verso il fronte
    const stepId = getAdjacentStep(source.id, target.id, gameState.territories, 'red');
    if (!stepId) return false;

    showAnimation(`${opponentNickname} sta spostando truppe`);

    setGameState(prev => ({
      ...prev,
      territories: prev.territories.map(t => {
        if (t.id === source.id) {
          return { ...t, troops: t.troops - moveTroops };
        }
        if (t.id === stepId) {
          return { ...t, troops: t.troops + moveTroops };
        }
        return t;
      })
    }));

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: 'blue',
        turnTimeLeft: 30
      }));
    }, 800);

    return true;
  }

  return false;
};

// ⚔️ ATTACCO MONTE CARLO
const tryMonteCarloAttack = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  handleCombat: (attackerId: string, defenderId: string, attackerTroops: number) => void,
  showAnimation: (message: string) => void,
  attackOpportunities: AttackOpportunity[],
  riskLevel: number,
  opponentNickname: string
): boolean => {
  // Soglia dinamica: più aggressivo se rischio è basso, più prudente se alto
  const baseThreshold = riskLevel > 0.6 ? 0.8 : (riskLevel > 0.4 ? 0.7 : 0.65);

  // Valuta attacchi con soglia locale più bassa per difensori deboli (1-2 truppe)
  const viableAttacks = attackOpportunities.filter(opp => {
    const advantage = opp.attackerTroops - opp.defenderTroops;
    const localThreshold = opp.defenderTroops <= 2 ? Math.max(0.55, baseThreshold - 0.1) : baseThreshold;
    const requiredAdvantage = opp.defenderTroops <= 2 ? 1 : 2;
    return opp.monteCarloScore >= localThreshold && advantage >= requiredAdvantage;
  });

  if (viableAttacks.length > 0) {
    const bestAttack = viableAttacks[0];

    showAnimation(`${opponentNickname} sta attaccando`);

    setTimeout(() => {
      handleCombat(bestAttack.attackerId, bestAttack.defenderId, bestAttack.attackerTroops);
    }, 500);

    return true;
  }

  return false;
};

// 🏁 CONQUISTA OPPORTUNISTICA (garantire almeno un tentativo di conquista)
const tryOpportunisticConquest = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  handleCombat: (attackerId: string, defenderId: string, attackerTroops: number) => void,
  showAnimation: (message: string) => void,
  attackOpportunities: AttackOpportunity[],
  opponentNickname: string
): boolean => {
  // Priorità a difensori con 1 truppa, poi 2
  const cheap = attackOpportunities
    .filter(opp => opp.defenderTroops <= 2 && (opp.attackerTroops - opp.defenderTroops) >= 1)
    .sort((a, b) => {
      const valA = (a.continentalValue + a.strategicValue) * (a.defenderTroops === 1 ? 2 : 1);
      const valB = (b.continentalValue + b.strategicValue) * (b.defenderTroops === 1 ? 2 : 1);
      return valB - valA;
    });

  if (cheap.length === 0) return false;

  const attack = cheap[0];
  showAnimation(`${opponentNickname} sta attaccando`);

  setTimeout(() => {
    handleCombat(attack.attackerId, attack.defenderId, attack.attackerTroops);
  }, 400);

  return true;
};

// 🧱 ASSALTO PREPARATO (consolida truppe su un fronte e attacca)
const tryPreparedAssault = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  handleCombat: (attackerId: string, defenderId: string, attackerTroops: number) => void,
  showAnimation: (message: string) => void,
  myTerritories: Territory[],
  opponentNickname: string
): boolean => {
  // Trova fronti: territori rossi adiacenti a nemici
  const fronts = myTerritories.filter(a =>
    a.neighbors.some(nId => {
      const n = gameState.territories.find(t => t.id === nId);
      return n && n.owner === 'blue';
    })
  );

  // Candidati: preferisci nemici con 1-2 truppe
  type Candidate = { attacker: Territory; enemy: Territory; supplier: Territory; move: number };
  const candidates: Candidate[] = [];

  for (const a of fronts) {
    const enemies = a.neighbors
      .map(nId => gameState.territories.find(t => t.id === nId))
      .filter((t): t is Territory => !!t && t.owner === 'blue')
      .sort((e1, e2) => e1.troops - e2.troops);

    if (enemies.length === 0) continue;
    const e = enemies[0];

    // Fornitori adiacenti al fronte con abbastanza truppe
    const suppliers = a.neighbors
      .map(nId => gameState.territories.find(t => t.id === nId))
      .filter((t): t is Territory => !!t && t.owner === 'red' && t.id !== a.id && t.troops >= 4)
      .sort((s1, s2) => s2.troops - s1.troops);

    if (suppliers.length === 0) continue;

    const s = suppliers[0];
    const move = Math.min(2, s.troops - 1); // muovi 1-2 truppe per creare vantaggio
    if (move <= 0) continue;

    candidates.push({ attacker: a, enemy: e, supplier: s, move });
  }

  if (candidates.length === 0) return false;

  // Punteggio: preferisci nemico con 1 truppa e attaccante con più vicini strategici
  candidates.sort((c1, c2) => {
    const score = (c: Candidate) => (c.enemy.troops <= 1 ? 100 : 50) + (c.attacker.neighbors.length * 2) - c.enemy.troops;
    return score(c2) - score(c1);
  });

  const best = candidates[0];

  // Sposta e attacca subito
  showAnimation(`${opponentNickname} sta spostando truppe`);
  setGameState(prev => ({
    ...prev,
    territories: prev.territories.map(t => {
      if (t.id === best.supplier.id) return { ...t, troops: t.troops - best.move };
      if (t.id === best.attacker.id) return { ...t, troops: t.troops + best.move };
      return t;
    })
  }));

  // Calcola truppe che attaccheranno (tutte meno 1)
  const plannedAttackTroops = Math.max(1, best.attacker.troops + best.move - 1);

  setTimeout(() => {
    showAnimation(`${opponentNickname} sta attaccando`);
    handleCombat(best.attacker.id, best.enemy.id, plannedAttackTroops);
  }, 350);

  return true;
};

// 🛡️ FORTIFICAZIONE CHOKEPOINTS (solo territori strategici deboli)
const tryChokePointFortification = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  showAnimation: (message: string) => void,
  myTerritories: Territory[],
  opponentNickname: string
): boolean => {
  const chokepoints = myTerritories.filter(t => 
    TerritorialAnalyzer.identifyChokepoints(t, gameState.territories)
  );

  // Solo chokepoint REALMENTE deboli (< 3 truppe)
  const weakChokepoints = chokepoints.filter(cp => cp.troops < 3);

  if (weakChokepoints.length === 0) return false;

  const target = weakChokepoints[0];
  const sources = myTerritories.filter(t => {
    const hasNoEnemyNeighbor = !t.neighbors.some(nId => {
      const n = gameState.territories.find(ter => ter.id === nId);
      return n && n.owner === 'blue';
    });
    return hasNoEnemyNeighbor && t.troops >= 4 && t.id !== target.id;
  }).sort((a, b) => b.troops - a.troops);

  if (sources.length > 0) {
    const source = sources[0];
    const moveTroops = Math.floor(source.troops / 2);

    showAnimation(`${opponentNickname} sta spostando truppe`);

    setGameState(prev => ({
      ...prev,
      territories: prev.territories.map(t => {
        if (t.id === source.id) {
          return {...t, troops: t.troops - moveTroops};
        }
        if (t.id === target.id) {
          return {...t, troops: t.troops + moveTroops};
        }
        return t;
      })
    }));

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: 'blue',
        turnTimeLeft: 30
      }));
    }, 800);

    return true;
  }

  return false;
};

// 🌍 ESPANSIONE CALCOLATA
const tryCalculatedExpansion = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  myTerritories: Territory[],
  neutralTerritories: Territory[],
  enemyTerritories: Territory[],
  riskLevel: number
): boolean => {
  // Espandi solo se rischio è basso o medio
  if (riskLevel > 0.6) return false;

  for (const myTerritory of myTerritories) {
    if (myTerritory.troops < 3) continue;

    const neutralNeighbors = myTerritory.neighbors
      .map(nId => gameState.territories.find(t => t.id === nId))
      .filter(t => t && !t.owner) as Territory[];

    const safeNeutrals = neutralNeighbors.filter(neutral => {
      const dangerousNeighbors = neutral.neighbors.filter(nId => {
        const n = gameState.territories.find(t => t.id === nId);
        return n && n.owner === 'blue' && n.troops >= 4;
      });
      return dangerousNeighbors.length === 0;
    });

    if (safeNeutrals.length > 0) {
      const target = safeNeutrals[0];
      const moveTroops = Math.floor(myTerritory.troops / 2);

      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => {
          if (t.id === myTerritory.id) {
            return {...t, troops: t.troops - moveTroops};
          }
          if (t.id === target.id) {
            return {...t, owner: 'red', troops: moveTroops};
          }
          return t;
        })
      }));

      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 500);

      return true;
    }
  }

  return false;
};

// 🔄 CONSOLIDAMENTO ZONE
const tryZoneConsolidation = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  myTerritories: Territory[],
  threats: ThreatAnalysis[]
): boolean => {
  const rearTerritories = myTerritories.filter(t => {
    const hasEnemyNeighbor = t.neighbors.some(nId => {
      const n = gameState.territories.find(ter => ter.id === nId);
      return n && n.owner === 'blue';
    });
    return !hasEnemyNeighbor && t.troops >= 2 && t.troops <= 3;
  });

  if (rearTerritories.length > 0) {
    const weakRear = rearTerritories[0];
    const frontlineTerritories = myTerritories.filter(t => {
      const threat = threats.find(th => th.territoryId === t.id);
      return threat && threat.threatLevel > 0;
    }).sort((a, b) => {
      const threatA = threats.find(th => th.territoryId === a.id)?.threatLevel || 0;
      const threatB = threats.find(th => th.territoryId === b.id)?.threatLevel || 0;
      return threatB - threatA;
    });

    if (frontlineTerritories.length > 0) {
      const target = frontlineTerritories[0];
      const moveTroops = weakRear.troops - 1;

      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => {
          if (t.id === weakRear.id) {
            return {...t, troops: 1};
          }
          if (t.id === target.id) {
            return {...t, troops: t.troops + moveTroops};
          }
          return t;
        })
      }));

      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 500);

      return true;
    }
  }

  return false;
};

// 🎯 TROVA TERRITORIO STRATEGICO SUPREMO
const findUltimateStrategicTerritory = (
  myTerritories: Territory[],
  threats: ThreatAnalysis[],
  continents: ContinentalControl[],
  pressurePoints: Territory[]
): Territory => {
  const scored = myTerritories.map(t => {
    let score = 0;
    
    const threat = threats.find(th => th.territoryId === t.id);
    if (threat) {
      if (threat.isChokepoint) score += 20;
      if (threat.isStrategic) score += 15;
      if (threat.threatLevel > 5) score += threat.threatLevel * 2;
      score += threat.zoneInfluence;
    }

    continents.forEach(continent => {
      if (continent.territories.includes(t.name) && continent.isStrategic) {
        score += continent.completionValue * 15;
      }
    });

    if (pressurePoints.some(pp => pp.id === t.id)) {
      score += 25;
    }

    score += t.neighbors.length * 3;
    score += t.troops;
    
    return { territory: t, score };
  });

  return scored.reduce((max, curr) => curr.score > max.score ? curr : max).territory;
};
