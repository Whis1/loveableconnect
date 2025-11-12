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
}

// Sistema di memoria globale per l'AI
const aiMemory = new AIMemorySystem();
let turnCounter = 0;

export const aiMakeMove = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  handleCombat: (attackerId: string, defenderId: string, attackerTroops: number) => void,
  showAnimation: (message: string) => void,
  opponentNickname: string,
  audioPlayers?: {
    bombSound: HTMLAudioElement;
    parachuteSound: HTMLAudioElement;
    powerUpSound: HTMLAudioElement;
    marchSound: HTMLAudioElement;
  },
  showToast?: (message: string, type: 'success' | 'info' | 'error') => void,
  setBombingAnimation?: (state: { show: boolean; position: { x: number; y: number } }) => void,
  setMovingTroops?: (state: { fromId: string; toId: string; count: number } | null) => void
) => {
  turnCounter++;
  
  const myTerritories = gameState.territories.filter(t => t.owner === 'red');
  const enemyTerritories = gameState.territories.filter(t => t.owner === 'blue');
  const neutralTerritories = gameState.territories.filter(t => !t.owner);

  // 📊 CALCOLO VANTAGGIO TERRITORIALE (più territori = più truppe per turno)
  const myTerritoryCount = myTerritories.length;
  const enemyTerritoryCount = enemyTerritories.length;
  const myTroopsPerTurn = myTerritoryCount >= 20 ? 3 : 1;
  const enemyTroopsPerTurn = enemyTerritoryCount >= 20 ? 3 : 1;
  const territorialAdvantage = myTerritoryCount - enemyTerritoryCount;
  
  // L'AI sa che conquistare territori è fondamentale per vincere
  const needsExpansion = territorialAdvantage <= 0 || myTerritoryCount < 15;

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
    myTerritories: myTerritoryCount,
    enemyTerritories: enemyTerritoryCount,
    territorialAdvantage,
    myTroopsPerTurn,
    needsExpansion,
    momentum: momentum.playerMomentum.toFixed(2),
    riskLevel: riskLevel.toFixed(2),
    turnsToDefeat: momentum.turnsToDefeat,
    predictedTargets: playerPrediction.likelyTargets.slice(0, 2),
    pressurePoints: pressurePoints.length,
    bestContinent: continents[0]?.region
  });

  // 🚨 FASE 1: RISPOSTA EMERGENZA (se rischio critico)
  if (riskLevel > 0.7 || (momentum.turnsToDefeat && momentum.turnsToDefeat < 5)) {
    if (tryEmergencyDefense(gameState, setGameState, handleCombat, showAnimation, myTerritories, enemyTerritories, pressurePoints, opponentNickname, audioPlayers, showToast, setBombingAnimation, setMovingTroops)) {
      return;
    }
  }

  // 🌍 FASE 2: ESPANSIONE TERRITORIALE AGGRESSIVA (priorità massima!)
  if (needsExpansion || riskLevel < 0.5) {
    if (tryAggressiveExpansion(gameState, setGameState, handleCombat, showAnimation, myTerritories, enemyTerritories, neutralTerritories, attackOpportunities, opponentNickname, audioPlayers, setMovingTroops)) {
      return;
    }
  }

  // 🎯 FASE 3: PREVISIONE E CONTRATTACCO
  if (playerPrediction.confidence > 0.5 && playerPrediction.likelyTargets.length > 0) {
    if (tryPreemptiveDefense(gameState, setGameState, showAnimation, playerPrediction, myTerritories, opponentNickname, audioPlayers, setMovingTroops)) {
      return;
    }
  }

  // 🏁 FASE 4: CONQUISTA OPPORTUNISTICA (priorità territori con 1-3 truppe)
  if (tryOpportunisticConquest(gameState, setGameState, handleCombat, showAnimation, attackOpportunities, opponentNickname, needsExpansion)) {
    return;
  }

  // 🏆 FASE 5: CONTROLLO CONTINENTALE
  if (tryContinentalStrategy(gameState, setGameState, handleCombat, showAnimation, continents, myTerritories, enemyTerritories, attackOpportunities, opponentNickname)) {
    return;
  }

  // ⚔️ FASE 6: ATTACCO CON SIMULAZIONI MONTE CARLO
  if (tryMonteCarloAttack(gameState, setGameState, handleCombat, showAnimation, attackOpportunities, riskLevel, opponentNickname)) {
    return;
  }

  // 🧱 FASE 7: ASSALTO PREPARATO (sposto truppe sul fronte e attacco subito)
  if (tryPreparedAssault(gameState, setGameState, handleCombat, showAnimation, myTerritories, opponentNickname, audioPlayers, setMovingTroops)) {
    return;
  }

  // 🎴 FASE 8: USO CARTE STRATEGICO (tutte: bomba, paracadute, force, truppe)
  if (tryAllCardsStrategically(gameState, setGameState, showAnimation, handleCombat, myTerritories, enemyTerritories, threats, attackOpportunities, momentum, riskLevel, continents, opponentNickname, audioPlayers, showToast, setBombingAnimation)) {
    return;
  }

  // 🔄 FASE 9: SPOSTAMENTO TRUPPE TATTICO
  if (tryTacticalTroopMovement(gameState, setGameState, showAnimation, myTerritories, threats, pressurePoints, opponentNickname, audioPlayers, setMovingTroops)) {
    return;
  }

  // 🛡️ FASE 10: FORTIFICAZIONE CHOKEPOINTS (solo territori critici)
  if (tryChokePointFortification(gameState, setGameState, showAnimation, myTerritories, opponentNickname, audioPlayers, setMovingTroops)) {
    return;
  }

  // 🔄 FASE 11: CONSOLIDAMENTO ZONE
  if (tryZoneConsolidation(gameState, setGameState, myTerritories, threats, opponentNickname, audioPlayers, setMovingTroops, showAnimation)) {
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
    
    showAnimation(`${opponentNickname} ha aggiunto +${amount} truppe su ${strategic.name}`);
    if (showToast) showToast(`${opponentNickname} ha aggiunto +${amount} truppe su ${strategic.name}`, 'success');
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
  opponentNickname: string,
  audioPlayers?: {
    bombSound: HTMLAudioElement;
    parachuteSound: HTMLAudioElement;
    powerUpSound: HTMLAudioElement;
    marchSound: HTMLAudioElement;
  },
  showToast?: (message: string, type: 'success' | 'info' | 'error') => void,
  setBombingAnimation?: (state: { show: boolean; position: { x: number; y: number } }) => void,
  setMovingTroops?: (state: { fromId: string; toId: string; count: number } | null) => void
): boolean => {
  if (pressurePoints.length === 0) return false;

  // Usa la bomba su minacce immediate
  if (gameState.cardCooldowns.red.bomb === 0) {
    const mostThreatened = pressurePoints[0];
    const strongestThreat = mostThreatened.neighbors
      .map(nId => gameState.territories.find(t => t.id === nId))
      .filter(t => t && t.owner === 'blue')
      .sort((a, b) => b!.troops - a!.troops)[0];

    if (strongestThreat && strongestThreat.troops >= 3) {
      // Riproduci audio bomba
      if (audioPlayers?.bombSound) {
        audioPlayers.bombSound.currentTime = 0;
        audioPlayers.bombSound.play().catch(console.error);
      }

      // Mostra animazione bombardamento se disponibile
      if (setBombingAnimation) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        setBombingAnimation({
          show: true,
          position: { x: screenWidth / 2, y: screenHeight / 2 }
        });
        
        setTimeout(() => {
          showAnimation("💣 Bombardamento aereo!");
          
          setGameState(prev => ({
            ...prev,
            territories: prev.territories.map(t => {
              if (t.id === strongestThreat.id) {
                const newTroops = Math.max(0, t.troops - 2);
                return {...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner};
              }
              return t;
            }),
            cardCooldowns: {
              ...prev.cardCooldowns,
              red: {...prev.cardCooldowns.red, bomb: 5}
            }
          }));
          
          setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              currentPlayer: 'blue',
              turnTimeLeft: 30
            }));
          }, 3000);
        }, 2300);
      } else {
        showAnimation("💣 Bombardamento aereo!");
        
        setGameState(prev => ({
          ...prev,
          territories: prev.territories.map(t => {
            if (t.id === strongestThreat.id) {
              const newTroops = Math.max(0, t.troops - 2);
              return {...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner};
            }
            return t;
          }),
          cardCooldowns: {
            ...prev.cardCooldowns,
            red: {...prev.cardCooldowns.red, bomb: 5}
          }
        }));
        
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            currentPlayer: 'blue',
            turnTimeLeft: 30
          }));
        }, 1500);
      }
      
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

    // Riproduci audio marcia
    if (audioPlayers?.marchSound) {
      audioPlayers.marchSound.currentTime = 0;
      audioPlayers.marchSound.play().catch(console.error);
    }

    // Avvia animazione truppe
    if (setMovingTroops) {
      setMovingTroops({
        fromId: source.id,
        toId: stepId,
        count: moveTroops
      });
      
      setTimeout(() => {
        setMovingTroops(null);
      }, 1000);
    }

    showAnimation(`${opponentNickname} sta spostando truppe`);

    // Aggiorna stato DOPO un piccolo delay per far vedere l'animazione partire
    setTimeout(() => {
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
    }, 1000);

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: 'blue',
        turnTimeLeft: 30
      }));
    }, 2000);

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
  opponentNickname: string,
  audioPlayers?: {
    bombSound: HTMLAudioElement;
    parachuteSound: HTMLAudioElement;
    powerUpSound: HTMLAudioElement;
    marchSound: HTMLAudioElement;
  },
  setMovingTroops?: (state: { fromId: string; toId: string; count: number } | null) => void
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

    // Riproduci audio marcia
    if (audioPlayers?.marchSound) {
      audioPlayers.marchSound.currentTime = 0;
      audioPlayers.marchSound.play().catch(console.error);
    }

    // Avvia animazione truppe
    if (setMovingTroops) {
      setMovingTroops({
        fromId: source.id,
        toId: predictedTarget.id,
        count: moveTroops
      });
      
      setTimeout(() => {
        setMovingTroops(null);
      }, 1000);
    }

    showAnimation(`${opponentNickname} sta spostando truppe`);

    // Aggiorna stato DOPO un piccolo delay
    setTimeout(() => {
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
    }, 1000);

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: 'blue',
        turnTimeLeft: 30
      }));
    }, 2000);

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
  opponentNickname: string,
  audioPlayers?: {
    bombSound: HTMLAudioElement;
    parachuteSound: HTMLAudioElement;
    powerUpSound: HTMLAudioElement;
    marchSound: HTMLAudioElement;
  },
  showToast?: (message: string, type: 'success' | 'info' | 'error') => void,
  setBombingAnimation?: (state: { show: boolean; position: { x: number; y: number } }) => void
): boolean => {
  // Valuta quale carta usare in base alla situazione
  const cardScores = {
    force: 0,
    bomb: 0,
    parachute: 0,
    troops: 0
  };

  // 🎯 CALCOLO SITUAZIONE TATTICA
  const myTotalTroops = myTerritories.reduce((sum, t) => sum + t.troops, 0);
  const enemyTotalTroops = enemyTerritories.reduce((sum, t) => sum + t.troops, 0);
  const averageTroopsPerTerritory = myTotalTroops / Math.max(1, myTerritories.length);
  const troopDeficit = enemyTotalTroops - myTotalTroops;

  // 🪖 TRUPPE: PRIORITÀ MASSIMA - l'AI deve crescere!
  // Base score molto alto per far sì che usi sempre le truppe
  cardScores.troops = 100;
  
  // Bonus se sotto in truppe rispetto al nemico
  if (troopDeficit > 0) {
    cardScores.troops += Math.min(50, troopDeficit * 5); // +5 per ogni truppa di svantaggio
  }
  
  // Bonus se la media per territorio è bassa (territori deboli)
  if (averageTroopsPerTerritory < 3) {
    cardScores.troops += 30;
  }
  
  // Bonus in situazioni critiche
  const criticalTerritories = threats.filter(t => t.threatLevel > 8 || t.isChokepoint).length;
  const almostCompleteContinents = continents.filter(c => c.completionValue >= 0.7 && c.completionValue < 1).length;
  
  if (criticalTerritories > 0) cardScores.troops += (criticalTerritories * 10);
  if (almostCompleteContinents > 0) cardScores.troops += 25;
  if (riskLevel > 0.6) cardScores.troops += 20;

  // FORCE: Alto valore se c'è un buon attacco strategico disponibile
  if (gameState.cardCooldowns.red.force === 0 && attackOpportunities.length > 0) {
    const goodAttack = attackOpportunities.find(opp => 
      opp.monteCarloScore >= 0.65 && (opp.strategicValue + opp.continentalValue) >= 8
    );
    if (goodAttack) cardScores.force = 155; // Punteggio più alto per usarla più spesso
  }

  // BOMBA: Usala solo se ci sono obiettivi REALMENTE pericolosi
  if (gameState.cardCooldowns.red.bomb === 0 && enemyTerritories.length > 0) {
    const dangeroustargets = enemyTerritories.filter(t => t.troops >= 4); // Minimo 4 truppe
    if (dangeroustargets.length > 0) {
      const maxValue = Math.max(...dangeroustargets.map(t => {
        let value = t.troops * 10;
        const isChokepoint = TerritorialAnalyzer.identifyChokepoints(t, gameState.territories);
        if (isChokepoint) value += 30;
        return value;
      }));
      
      // Score alto solo se target ha 5+ truppe
      if (maxValue >= 50) cardScores.bomb = 130;
      else if (maxValue >= 40) cardScores.bomb = 110;
    }
  }

  // PARACADUTE: Usalo solo per obiettivi VERAMENTE strategici
  if (gameState.cardCooldowns.red.parachute === 0) {
    const highValueTargets = enemyTerritories
      .filter(t => t.troops === 1)
      .filter(t => {
        const isChokepoint = TerritorialAnalyzer.identifyChokepoints(t, gameState.territories);
        const inAlmostCompleteContinent = continents.some(c => 
          c.territories.includes(t.name) && c.completionValue >= 0.6
        );
        return isChokepoint || inAlmostCompleteContinent;
      }).length;
    
    if (highValueTargets > 0) cardScores.parachute = 120;
    
    // Kamikaze solo su truppe MASSIVE (7+)
    const massiveTargets = enemyTerritories.filter(t => t.troops >= 7).length;
    if (massiveTargets > 0) cardScores.parachute = Math.max(cardScores.parachute, 115);
  }

  // Usa la carta con punteggio più alto
  const bestCard = Object.entries(cardScores).reduce((max, [card, score]) => 
    score > max.score ? { card, score } : max
  , { card: '', score: 0 });

  if (bestCard.score === 0) return false;

  // FORZA: Usa con attacco strategico
  if (bestCard.card === 'force' && gameState.cardCooldowns.red.force === 0 && attackOpportunities.length > 0) {
    const goodAttack = attackOpportunities.find(opp => 
      opp.monteCarloScore >= 0.6 && (opp.strategicValue + opp.continentalValue) >= 8
    );

    if (goodAttack) {
      const attacker = gameState.territories.find(t => t.id === goodAttack.attackerId);
      const defender = gameState.territories.find(t => t.id === goodAttack.defenderId);

      if (attacker && defender) {
        // Riproduci audio potenziamento
        if (audioPlayers?.powerUpSound) {
          audioPlayers.powerUpSound.currentTime = 0;
          audioPlayers.powerUpSound.play().catch(console.error);
        }

        showAnimation("⚡ Truppe potenziate!");
        if (showToast) showToast(`${opponentNickname} ha potenziato le sue truppe!`, 'success');
        
        setGameState(prev => ({
          ...prev,
          boostedTroops: {
            ...prev.boostedTroops,
            [attacker.id]: attacker.troops
          },
          cardCooldowns: {
            ...prev.cardCooldowns,
            red: {...prev.cardCooldowns.red, force: 4}
          }
        }));

        setTimeout(() => {
          handleCombat(attacker.id, defender.id, attacker.troops - 1);
        }, 800);

        return true;
      }
    }
  }

  // BOMBA: Colpisce OVUNQUE sulla mappa - non serve essere vicini!
  if (gameState.cardCooldowns.red.bomb === 0 && enemyTerritories.length > 0) {
    // 💣 STRATEGIA GLOBALE: La bomba può colpire QUALSIASI territorio nemico
    const strategicTargets = enemyTerritories
      .filter(t => t.troops >= 2)
      .map(t => {
        // Calcola valore strategico globale (non serve essere adiacenti!)
        let strategicValue = 0;
        
        // Priorità: territori con molte truppe
        strategicValue += t.troops * 10;
        
        // Bonus se è un chokepoint
        const isChokepoint = TerritorialAnalyzer.identifyChokepoints(t, gameState.territories);
        if (isChokepoint) strategicValue += 30;
        
        // Bonus se ha tanti vicini (hub strategico)
        strategicValue += t.neighbors.length * 5;
        
        // Bonus se conquistandolo completeremmo un continente
        const continentValue = continents.find(c => 
          c.territories.includes(t.name) && c.completionValue >= 0.6
        );
        if (continentValue) strategicValue += 25;
        
        return { territory: t, strategicValue };
      })
      .sort((a, b) => b.strategicValue - a.strategicValue);

    // 🎲 IMPREVEDIBILITÀ: 40% chance di non scegliere sempre il migliore
    if (strategicTargets.length > 0) {
      let target: typeof strategicTargets[0];
      const randomChoice = Math.random();
      if (randomChoice > 0.6 && strategicTargets.length > 1) {
        target = strategicTargets[1]; // 40% secondo migliore
      } else if (randomChoice > 0.85 && strategicTargets.length > 2) {
        target = strategicTargets[2]; // 25% terzo migliore
      } else {
        target = strategicTargets[0];
      }
      
      // Riproduci audio bomba
      if (audioPlayers?.bombSound) {
        audioPlayers.bombSound.currentTime = 0;
        audioPlayers.bombSound.play().catch(console.error);
      }

      // Mostra animazione bombardamento se disponibile
      if (setBombingAnimation) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        setBombingAnimation({
          show: true,
          position: { x: screenWidth / 2, y: screenHeight / 2 }
        });
        
        // Aspetta che l'animazione completi prima di applicare l'effetto
        setTimeout(() => {
          showAnimation("💣 Bombardamento aereo!");
          if (showToast) showToast(`${opponentNickname} ha bombardato il tuo territorio "${target.territory.name}"!`, 'error');
          
          setGameState(prev => ({
            ...prev,
            territories: prev.territories.map(t => {
              if (t.id === target.territory.id) {
                const newTroops = Math.max(0, t.troops - 2);
                return {...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner};
              }
              return t;
            }),
            cardCooldowns: {
              ...prev.cardCooldowns,
              red: {...prev.cardCooldowns.red, bomb: 5}
            }
          }));
          
          setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              currentPlayer: 'blue',
              turnTimeLeft: 30
            }));
          }, 3000);
        }, 2300);
      } else {
        // Fallback senza animazione
        showAnimation("💣 Bombardamento aereo!");
        if (showToast) showToast(`${opponentNickname} ha bombardato il tuo territorio "${target.territory.name}"!`, 'error');
        
        setGameState(prev => ({
          ...prev,
          territories: prev.territories.map(t => {
            if (t.id === target.territory.id) {
              const newTroops = Math.max(0, t.troops - 2);
              return {...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner};
            }
            return t;
          }),
          cardCooldowns: {
            ...prev.cardCooldowns,
            red: {...prev.cardCooldowns.red, bomb: 5}
          }
        }));
        
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            currentPlayer: 'blue',
            turnTimeLeft: 30
          }));
        }, 1500);
      }
      
      return true;
    }
  }

  // PARACADUTE: Colpisce OVUNQUE sulla mappa - non serve essere vicini!
  if (gameState.cardCooldowns.red.parachute === 0 && enemyTerritories.length > 0) {
    // 🪂 STRATEGIA GLOBALE: Il paracadute può colpire QUALSIASI territorio nemico
    
    // Priorità 1: Territori con 1 truppa (conquista istantanea ovunque!)
    const singleTroopTargets = enemyTerritories
      .filter(t => t.troops === 1)
      .map(t => {
        let strategicValue = 50; // Base value
        
        // Bonus se è un chokepoint
        const isChokepoint = TerritorialAnalyzer.identifyChokepoints(t, gameState.territories);
        if (isChokepoint) strategicValue += 40;
        
        // Bonus se conquistandolo completeremmo un continente
        const continentValue = continents.find(c => 
          c.territories.includes(t.name) && c.completionValue >= 0.6
        );
        if (continentValue) strategicValue += 35;
        
        // Bonus se ha tanti vicini (hub)
        strategicValue += t.neighbors.length * 8;
        
        // Bonus se è isolato dal nemico (facile da tenere)
        const enemyNeighbors = t.neighbors.filter(nId => {
          const n = gameState.territories.find(ter => ter.id === nId);
          return n && n.owner === 'blue';
        }).length;
        if (enemyNeighbors === 0) strategicValue += 25;
        
        return { territory: t, strategicValue };
      })
      .sort((a, b) => b.strategicValue - a.strategicValue);

    // 🎲 IMPREVEDIBILITÀ nella scelta
    if (singleTroopTargets.length > 0) {
      let target: typeof singleTroopTargets[0];
      const randomChoice = Math.random();
      if (randomChoice > 0.65 && singleTroopTargets.length > 1) {
        target = singleTroopTargets[1];
      } else if (randomChoice > 0.85 && singleTroopTargets.length > 2) {
        target = singleTroopTargets[2];
      } else {
        target = singleTroopTargets[0];
      }
      
      // Riproduci audio paracadute
      if (audioPlayers?.parachuteSound) {
        audioPlayers.parachuteSound.currentTime = 0;
        audioPlayers.parachuteSound.play().catch(console.error);
      }

      showAnimation("🪂 Paracadutista conquista territorio nemico!");
      if (showToast) showToast(`${opponentNickname} ha lanciato paracadutista sul tuo territorio "${target.territory.name}" da lontano!`, 'error');
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => 
          t.id === target.territory.id ? {...t, owner: 'red', troops: 1} : t
        ),
        cardCooldowns: {
          ...prev.cardCooldowns,
          red: {...prev.cardCooldowns.red, parachute: 3}
        }
      }));
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 3000);
      
      return true;
    }

    // Priorità 2: Kamikaze su concentrazioni massicce (5+ truppe) - colpisce ovunque!
    const massiveTargets = enemyTerritories
      .filter(t => t.troops >= 5)
      .map(t => {
        let strategicValue = t.troops * 8; // Più truppe = più valore
        
        // Bonus se è un chokepoint
        const isChokepoint = TerritorialAnalyzer.identifyChokepoints(t, gameState.territories);
        if (isChokepoint) strategicValue += 30;
        
        return { territory: t, strategicValue };
      })
      .sort((a, b) => b.strategicValue - a.strategicValue);
      
    if (massiveTargets.length > 0) {
      const target = massiveTargets[0];
      
      // Riproduci audio paracadute
      if (audioPlayers?.parachuteSound) {
        audioPlayers.parachuteSound.currentTime = 0;
        audioPlayers.parachuteSound.play().catch(console.error);
      }

      showAnimation("🪂 Paracadutista kamikaze! -1 truppa nemica");
      if (showToast) showToast(`${opponentNickname} ha lanciato paracadutista kamikaze sul tuo territorio "${target.territory.name}"! -1 truppa`, 'error');
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => 
          t.id === target.territory.id ? {...t, troops: t.troops - 1} : t
        ),
        cardCooldowns: {
          ...prev.cardCooldowns,
          red: {...prev.cardCooldowns.red, parachute: 3}
        }
      }));
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 3000);
      
      return true;
    }
  }

  // ESECUZIONE CARTA FORCE
  if (bestCard.card === 'force' && gameState.cardCooldowns.red.force === 0) {
    const goodAttack = attackOpportunities.find(opp => 
      opp.monteCarloScore >= 0.6 && (opp.strategicValue + opp.continentalValue) >= 8
    );

    if (goodAttack) {
      const attacker = gameState.territories.find(t => t.id === goodAttack.attackerId);
      const defender = gameState.territories.find(t => t.id === goodAttack.defenderId);

      if (attacker && defender) {
        // Riproduci audio potenziamento
        if (audioPlayers?.powerUpSound) {
          audioPlayers.powerUpSound.currentTime = 0;
          audioPlayers.powerUpSound.play().catch(console.error);
        }

        showAnimation("⚡ Truppe potenziate!");
        if (showToast) showToast(`${opponentNickname} ha potenziato le sue truppe!`, 'success');
        
        setGameState(prev => ({
          ...prev,
          boostedTroops: {
            ...prev.boostedTroops,
            [attacker.id]: attacker.troops
          },
          cardCooldowns: {
            ...prev.cardCooldowns,
            red: {...prev.cardCooldowns.red, force: 4}
          }
        }));

        setTimeout(() => {
          handleCombat(attacker.id, defender.id, attacker.troops - 1);
        }, 800);

        return true;
      }
    }
  }

  // ESECUZIONE CARTA BOMBA
  if (bestCard.card === 'bomb' && gameState.cardCooldowns.red.bomb === 0) {
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
      
      // Riproduci audio bomba
      if (audioPlayers?.bombSound) {
        audioPlayers.bombSound.currentTime = 0;
        audioPlayers.bombSound.play().catch(console.error);
      }

      // Mostra animazione bombardamento se disponibile
      if (setBombingAnimation) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        setBombingAnimation({
          show: true,
          position: { x: screenWidth / 2, y: screenHeight / 2 }
        });
        
        // Aspetta che l'animazione completi prima di applicare l'effetto
        setTimeout(() => {
          showAnimation("💣 Bombardamento aereo!");
          
          setGameState(prev => ({
            ...prev,
            territories: prev.territories.map(t => {
              if (t.id === target.id) {
                const newTroops = Math.max(0, t.troops - 2);
                return {...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner};
              }
              return t;
            }),
            cardCooldowns: {
              ...prev.cardCooldowns,
              red: {...prev.cardCooldowns.red, bomb: 5}
            }
          }));
          
          setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              currentPlayer: 'blue',
              turnTimeLeft: 30
            }));
          }, 3000);
        }, 2300);
      } else {
        // Fallback senza animazione
        showAnimation("💣 Bombardamento aereo!");
        
        setGameState(prev => ({
          ...prev,
          territories: prev.territories.map(t => {
            if (t.id === target.id) {
              const newTroops = Math.max(0, t.troops - 2);
              return {...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner};
            }
            return t;
          }),
          cardCooldowns: {
            ...prev.cardCooldowns,
            red: {...prev.cardCooldowns.red, bomb: 5}
          }
        }));
        
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            currentPlayer: 'blue',
            turnTimeLeft: 30
          }));
        }, 1500);
      }
      
      return true;
    }
  }

  // ESECUZIONE CARTA PARACADUTE
  if (bestCard.card === 'parachute' && gameState.cardCooldowns.red.parachute === 0) {
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
      
      // Riproduci audio paracadute
      if (audioPlayers?.parachuteSound) {
        audioPlayers.parachuteSound.currentTime = 0;
        audioPlayers.parachuteSound.play().catch(console.error);
      }

      showAnimation("🪂 Paracadutista elimina il nemico!");
      if (showToast) showToast(`${opponentNickname} ha buttato paracadutista sul tuo territorio "${target.name}"!`, 'error');
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => 
          t.id === target.id ? {...t, owner: 'red', troops: 1} : t
        ),
        cardCooldowns: {
          ...prev.cardCooldowns,
          red: {...prev.cardCooldowns.red, parachute: 3}
        }
      }));
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 3000);
      
      return true;
    }

    const massiveForces = enemyTerritories.filter(t => t.troops >= 5);
    if (massiveForces.length > 0) {
      const target = massiveForces.sort((a, b) => b.troops - a.troops)[0];
      
      // Riproduci audio paracadute
      if (audioPlayers?.parachuteSound) {
        audioPlayers.parachuteSound.currentTime = 0;
        audioPlayers.parachuteSound.play().catch(console.error);
      }

      showAnimation("🪂 Paracadutista abbattuto! -1 truppa nemica");
      if (showToast) showToast(`${opponentNickname} ha buttato paracadutista sul tuo territorio "${target.name}"! -1 truppa`, 'error');
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => 
          t.id === target.id ? {...t, troops: t.troops - 1} : t
        ),
        cardCooldowns: {
          ...prev.cardCooldowns,
          red: {...prev.cardCooldowns.red, parachute: 3}
        }
      }));
      
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 3000);
      
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
    
    showAnimation(`${opponentNickname} ha aggiunto +${amount} truppe su ${targetTerritory!.name}`);
    if (showToast) showToast(`${opponentNickname} ha aggiunto +${amount} truppe su ${targetTerritory!.name}`, 'success');
    
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
  opponentNickname: string,
  audioPlayers?: {
    bombSound: HTMLAudioElement;
    parachuteSound: HTMLAudioElement;
    powerUpSound: HTMLAudioElement;
    marchSound: HTMLAudioElement;
  },
  setMovingTroops?: (state: { fromId: string; toId: string; count: number } | null) => void
): boolean => {
  // 🎲 PERSONALITÀ AI VARIABILE per ogni turno (imprevedibilità)
  const aiPersonality = Math.random();
  const isAggressive = aiPersonality > 0.65; // 35% chance - attacca con più truppe
  const isCautious = aiPersonality < 0.35; // 35% chance - lascia più protezione
  // 30% middle ground - bilanciato

  // Riduci i movimenti tattici inutili - solo se realmente necessario
  const underPressure = pressurePoints.filter(pp => {
    const threat = threats.find(t => t.territoryId === pp.id);
    return threat && threat.threatLevel > 10 && pp.troops < 3;
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
      return hasNoEnemyNeighbor && t.troops >= 3 && t.id !== target.id; // Minimo 3 per lasciare 1
    }).sort((a, b) => b.troops - a.troops);

    if (safeSuppliers.length === 0) return false;

    const source = safeSuppliers[0];
    
    // 🎲 LOGICA IMPREVEDIBILE: varia la quantità in base alla personalità
    let moveTroops: number;
    if (isAggressive) {
      // Aggressivo: sposta 50-70% ma SEMPRE lascia almeno 1
      const percentage = 0.5 + Math.random() * 0.2;
      moveTroops = Math.max(1, Math.min(source.troops - 1, Math.floor(source.troops * percentage)));
    } else if (isCautious) {
      // Cauto: sposta 20-35% e lascia protezione
      const percentage = 0.2 + Math.random() * 0.15;
      moveTroops = Math.max(1, Math.min(source.troops - 1, Math.floor(source.troops * percentage)));
    } else {
      // Bilanciato: sposta 35-50%
      const percentage = 0.35 + Math.random() * 0.15;
      moveTroops = Math.max(1, Math.min(source.troops - 1, Math.floor(source.troops * percentage)));
    }
    
    // SICUREZZA: assicurati che source abbia almeno 1 truppa dopo
    if (source.troops - moveTroops < 1) {
      moveTroops = source.troops - 1;
    }
    if (moveTroops < 1) return false;

    // Riproduci audio marcia
    if (audioPlayers?.marchSound) {
      audioPlayers.marchSound.currentTime = 0;
      audioPlayers.marchSound.play().catch(console.error);
    }

    // Avvia animazione truppe
    if (setMovingTroops) {
      setMovingTroops({
        fromId: source.id,
        toId: target.id,
        count: moveTroops
      });
    }

    showAnimation(`${opponentNickname} sta spostando truppe`);

    // Aspetta animazione prima di aggiornare
    setTimeout(() => {
      if (setMovingTroops) {
        setMovingTroops(null);
      }
      
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
      }, 1000);
    }, 1000);

    return true;
  }

  const target = underPressure[0];
  
  // Trova territori sicuri con truppe eccedenti
  const safeSuppliers = myTerritories.filter(t => {
    const hasNoEnemyNeighbor = !t.neighbors.some(nId => {
      const n = gameState.territories.find(ter => ter.id === nId);
      return n && n.owner === 'blue';
    });
    return hasNoEnemyNeighbor && t.troops >= 3 && t.id !== target.id; // Minimo 3 per lasciare 1
  }).sort((a, b) => b.troops - a.troops);

  if (safeSuppliers.length > 0) {
    const source = safeSuppliers[0];
    
    // 🎲 LOGICA IMPREVEDIBILE per emergenze
    let moveTroops: number;
    if (isAggressive) {
      // Emergenza aggressiva: sposta 60-80%
      const percentage = 0.6 + Math.random() * 0.2;
      moveTroops = Math.max(1, Math.min(source.troops - 1, Math.floor(source.troops * percentage)));
    } else if (isCautious) {
      // Emergenza cauta: sposta 40-55%
      const percentage = 0.4 + Math.random() * 0.15;
      moveTroops = Math.max(1, Math.min(source.troops - 1, Math.floor(source.troops * percentage)));
    } else {
      // Emergenza bilanciata: sposta 50-65%
      const percentage = 0.5 + Math.random() * 0.15;
      moveTroops = Math.max(1, Math.min(source.troops - 1, Math.floor(source.troops * percentage)));
    }
    
    // SICUREZZA: assicurati che source abbia almeno 1 truppa dopo
    if (source.troops - moveTroops < 1) {
      moveTroops = source.troops - 1;
    }
    if (moveTroops < 1) return false;

    // Muovi solo di un passo verso il fronte
    const stepId = getAdjacentStep(source.id, target.id, gameState.territories, 'red');
    if (!stepId) return false;

    // Riproduci audio marcia
    if (audioPlayers?.marchSound) {
      audioPlayers.marchSound.currentTime = 0;
      audioPlayers.marchSound.play().catch(console.error);
    }

    // Avvia animazione truppe
    if (setMovingTroops) {
      setMovingTroops({
        fromId: source.id,
        toId: stepId,
        count: moveTroops
      });
    }

    showAnimation(`${opponentNickname} sta spostando truppe`);

    // Aspetta animazione prima di aggiornare
    setTimeout(() => {
      if (setMovingTroops) {
        setMovingTroops(null);
      }
      
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
      }, 1000);
    }, 1000);

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
  // Soglie più aggressive per garantire più attacchi
  const baseThreshold = riskLevel > 0.7 ? 0.6 : (riskLevel > 0.5 ? 0.5 : 0.4);

  // Attacchi ancora più aggressivi contro difensori deboli
  const viableAttacks = attackOpportunities.filter(opp => {
    const advantage = opp.attackerTroops - opp.defenderTroops;
    const localThreshold = opp.defenderTroops <= 2 ? Math.max(0.35, baseThreshold - 0.2) : baseThreshold;
    const requiredAdvantage = opp.defenderTroops <= 1 ? 0 : (opp.defenderTroops <= 2 ? 1 : 2);
    return opp.monteCarloScore >= localThreshold && advantage >= requiredAdvantage;
  });

  if (viableAttacks.length > 0) {
    // 🎲 IMPREVEDIBILITÀ: non sempre scegliere il migliore, 30% chance di prendere il 2° o 3° migliore
    let selectedAttack: AttackOpportunity;
    const randomChoice = Math.random();
    if (randomChoice > 0.7 && viableAttacks.length > 1) {
      // 30% chance: scegli il secondo migliore
      selectedAttack = viableAttacks[1];
    } else if (randomChoice > 0.85 && viableAttacks.length > 2) {
      // 15% chance: scegli il terzo migliore
      selectedAttack = viableAttacks[2];
    } else {
      selectedAttack = viableAttacks[0];
    }

    showAnimation(`${opponentNickname} sta attaccando`);

    setTimeout(() => {
      handleCombat(selectedAttack.attackerId, selectedAttack.defenderId, selectedAttack.attackerTroops);
    }, 500);

    return true;
  }

  return false;
};

// 🌍 ESPANSIONE TERRITORIALE AGGRESSIVA - Priorità massima per conquistare più territori
const tryAggressiveExpansion = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  handleCombat: (attackerId: string, defenderId: string, attackerTroops: number) => void,
  showAnimation: (message: string) => void,
  myTerritories: Territory[],
  enemyTerritories: Territory[],
  neutralTerritories: Territory[],
  attackOpportunities: AttackOpportunity[],
  opponentNickname: string,
  audioPlayers?: {
    bombSound: HTMLAudioElement;
    parachuteSound: HTMLAudioElement;
    powerUpSound: HTMLAudioElement;
    marchSound: HTMLAudioElement;
  },
  setMovingTroops?: (state: { fromId: string; toId: string; count: number } | null) => void
): boolean => {
  // 1. PRIORITÀ: Conquista territori neutrali adiacenti (espansione gratuita)
  for (const myTerritory of myTerritories) {
    if (myTerritory.troops < 2) continue;

    const neutralNeighbors = myTerritory.neighbors
      .map(nId => gameState.territories.find(t => t.id === nId))
      .filter(t => t && !t.owner) as Territory[];

    if (neutralNeighbors.length > 0) {
      const target = neutralNeighbors[0];
      
      // 🎲 VARIABILITÀ: non sempre metà, può essere da 30% a 70%
      const percentage = 0.3 + Math.random() * 0.4;
      let moveTroops = Math.max(1, Math.floor(myTerritory.troops * percentage));
      
      // SICUREZZA: lascia sempre almeno 1 truppa
      if (myTerritory.troops - moveTroops < 1) {
        moveTroops = myTerritory.troops - 1;
      }
      if (moveTroops < 1) continue;

      // Riproduci audio marcia
      if (audioPlayers?.marchSound) {
        audioPlayers.marchSound.currentTime = 0;
        audioPlayers.marchSound.play().catch(console.error);
      }

      // Avvia animazione truppe
      if (setMovingTroops) {
        setMovingTroops({
          fromId: myTerritory.id,
          toId: target.id,
          count: moveTroops
        });
        
        setTimeout(() => {
          setMovingTroops(null);
        }, 1000);
      }

      // Aggiorna stato DOPO animazione (1000ms)
      setTimeout(() => {
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
      }, 1000);

      // Switch turno DOPO update (2000ms totale)
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 2000);

      return true;
    }
  }

  // 2. ATTACCO AGGRESSIVO: Territori nemici con 1-2 truppe (conquista facile)
  const easyTargets = attackOpportunities
    .filter(opp => opp.defenderTroops <= 2 && opp.attackerTroops >= opp.defenderTroops)
    .sort((a, b) => a.defenderTroops - b.defenderTroops); // Attacca prima i più deboli

  if (easyTargets.length > 0) {
    const attack = easyTargets[0];
    showAnimation(`${opponentNickname} sta conquistando territori`);

    setTimeout(() => {
      handleCombat(attack.attackerId, attack.defenderId, attack.attackerTroops);
    }, 400);

    return true;
  }

  // 3. ATTACCO MEDIO: Territori con 3 truppe se abbiamo vantaggio
  const mediumTargets = attackOpportunities
    .filter(opp => opp.defenderTroops === 3 && opp.attackerTroops >= opp.defenderTroops + 1)
    .sort((a, b) => b.attackerTroops - a.attackerTroops);

  if (mediumTargets.length > 0) {
    const attack = mediumTargets[0];
    showAnimation(`${opponentNickname} sta espandendo il territorio`);

    setTimeout(() => {
      handleCombat(attack.attackerId, attack.defenderId, attack.attackerTroops);
    }, 400);

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
  opponentNickname: string,
  needsExpansion: boolean = false
): boolean => {
  // Se ha bisogno di espansione, attacca anche con 1 solo di vantaggio
  const threshold = needsExpansion ? 0 : 0;
  
  // Attacca QUALSIASI territorio con 1-4 truppe se hai almeno parità (o lieve vantaggio se serve espansione)
  const viable = attackOpportunities
    .filter(opp => opp.defenderTroops <= 4 && opp.attackerTroops >= opp.defenderTroops + threshold)
    .sort((a, b) => {
      // Priorità massima a territori con meno truppe = più facili da conquistare
      const priorityA = (100 - a.defenderTroops * 10) + (a.continentalValue + a.strategicValue);
      const priorityB = (100 - b.defenderTroops * 10) + (b.continentalValue + b.strategicValue);
      return priorityB - priorityA;
    });

  if (viable.length === 0) return false;

  const attack = viable[0];
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
  opponentNickname: string,
  audioPlayers?: {
    bombSound: HTMLAudioElement;
    parachuteSound: HTMLAudioElement;
    powerUpSound: HTMLAudioElement;
    marchSound: HTMLAudioElement;
  },
  setMovingTroops?: (state: { fromId: string; toId: string; count: number } | null) => void
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
    const move = Math.min(3, s.troops - 1); // muovi fino a 3 truppe per avere vantaggio decisivo
    if (move <= 0) continue;

    // Solo se l'attacco risultante ha buone chance
    const finalAttackTroops = a.troops + move - 1;
    if (finalAttackTroops <= e.troops) continue; // deve avere almeno vantaggio numerico

    candidates.push({ attacker: a, enemy: e, supplier: s, move });
  }

  if (candidates.length === 0) return false;

  // Punteggio: preferisci nemico con 1 truppa e attaccante con più vicini strategici
  candidates.sort((c1, c2) => {
    const score = (c: Candidate) => (c.enemy.troops <= 1 ? 100 : 50) + (c.attacker.neighbors.length * 2) - c.enemy.troops;
    return score(c2) - score(c1);
  });

  const best = candidates[0];

  // Riproduci audio marcia
  if (audioPlayers?.marchSound) {
    audioPlayers.marchSound.currentTime = 0;
    audioPlayers.marchSound.play().catch(console.error);
  }

  // Avvia animazione truppe
  if (setMovingTroops) {
    setMovingTroops({
      fromId: best.supplier.id,
      toId: best.attacker.id,
      count: best.move
    });
    
    setTimeout(() => {
      setMovingTroops(null);
    }, 1200);
  }

  // Sposta e attacca subito
  showAnimation(`${opponentNickname} sta spostando truppe`);
  
  setTimeout(() => {
    setGameState(prev => ({
      ...prev,
      territories: prev.territories.map(t => {
        if (t.id === best.supplier.id) return { ...t, troops: t.troops - best.move };
        if (t.id === best.attacker.id) return { ...t, troops: t.troops + best.move };
        return t;
      })
    }));
  }, 100);

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
  opponentNickname: string,
  audioPlayers?: {
    bombSound: HTMLAudioElement;
    parachuteSound: HTMLAudioElement;
    powerUpSound: HTMLAudioElement;
    marchSound: HTMLAudioElement;
  },
  setMovingTroops?: (state: { fromId: string; toId: string; count: number } | null) => void
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

    // Riproduci audio marcia
    if (audioPlayers?.marchSound) {
      audioPlayers.marchSound.currentTime = 0;
      audioPlayers.marchSound.play().catch(console.error);
    }

    // Avvia animazione truppe
    if (setMovingTroops) {
      setMovingTroops({
        fromId: source.id,
        toId: target.id,
        count: moveTroops
      });
      
      setTimeout(() => {
        setMovingTroops(null);
      }, 1000);
    }

    // Aggiorna stato DOPO un piccolo delay
    setTimeout(() => {
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
    }, 1000);

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: 'blue',
        turnTimeLeft: 30
      }));
    }, 2000);

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
  threats: ThreatAnalysis[],
  opponentNickname: string,
  audioPlayers?: {
    bombSound: HTMLAudioElement;
    parachuteSound: HTMLAudioElement;
    powerUpSound: HTMLAudioElement;
    marchSound: HTMLAudioElement;
  },
  setMovingTroops?: (state: { fromId: string; toId: string; count: number } | null) => void,
  showAnimation?: (message: string) => void
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

      // Riproduci audio marcia
      if (audioPlayers?.marchSound) {
        audioPlayers.marchSound.currentTime = 0;
        audioPlayers.marchSound.play().catch(console.error);
      }

      // Avvia animazione truppe
      if (setMovingTroops) {
        setMovingTroops({
          fromId: weakRear.id,
          toId: target.id,
          count: moveTroops
        });
        
        setTimeout(() => {
          setMovingTroops(null);
        }, 1000);
      }

      // Aggiorna stato DOPO animazione (1000ms)
      setTimeout(() => {
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
      }, 1000);

      // Switch turno DOPO update (2000ms totale)
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          currentPlayer: 'blue',
          turnTimeLeft: 30
        }));
      }, 2000);

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
