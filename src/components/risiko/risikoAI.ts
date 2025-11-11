import { Territory } from "./territoryGenerator";
import { canMoveTroops, simulateBattle } from "./risikoLogic";

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

export const aiMakeMove = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  handleCombat: (attackerId: string, defenderId: string, attackerTroops: number) => void,
  showAnimation: (message: string) => void,
  opponentNickname: string
) => {
  const myTerritories = gameState.territories.filter(t => t.owner === 'red');
  const enemyTerritories = gameState.territories.filter(t => t.owner === 'blue');
  const neutralTerritories = gameState.territories.filter(t => !t.owner);

  // Strategy 1: Use cards if beneficial
  if (tryUseCards(gameState, setGameState, showAnimation, myTerritories, enemyTerritories, neutralTerritories, opponentNickname)) {
    return;
  }

  // Strategy 2: Attack weak enemy territories
  if (tryAttackWeakEnemy(gameState, setGameState, handleCombat, myTerritories, enemyTerritories)) {
    return;
  }

  // Strategy 3: Expand to neutral territories
  if (tryExpandToNeutral(gameState, setGameState, myTerritories, neutralTerritories)) {
    return;
  }

  // Strategy 4: Consolidate troops
  if (tryConsolidateTroops(gameState, setGameState, myTerritories)) {
    return;
  }

  // Default: End turn
  setTimeout(() => {
    setGameState(prev => ({
      ...prev,
      currentPlayer: 'blue',
      turnTimeLeft: 30,
      selectedTerritory: null,
      selectedCard: null
    }));
  }, 500);
};

const tryUseCards = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  showAnimation: (message: string) => void,
  myTerritories: Territory[],
  enemyTerritories: Territory[],
  neutralTerritories: Territory[],
  opponentNickname: string
): boolean => {
  const redCount = myTerritories.length;
  
  // Use troops card on strongest territory
  if (myTerritories.length > 0) {
    const strongest = myTerritories.reduce((max, t) => t.troops > max.troops ? t : max);
    const amount = redCount >= 20 ? 3 : 1;
    
    setGameState(prev => ({
      ...prev,
      territories: prev.territories.map(t => 
        t.id === strongest.id ? {...t, troops: t.troops + amount} : t
      )
    }));
    
    showAnimation(`${opponentNickname}: +${amount} truppe aggiunte`);
    
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        currentPlayer: 'blue',
        turnTimeLeft: 30
      }));
    }, 1000);
    
    return true;
  }

  // Use bomb on strong enemy territory
  if (gameState.cardCooldowns.bomb === 0 && enemyTerritories.length > 0) {
    const strongest = enemyTerritories.reduce((max, t) => t.troops > max.troops ? t : max);
    if (strongest.troops >= 3) {
      showAnimation(`${opponentNickname}: Bombardamento aereo! 💣`);
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => {
          if (t.id === strongest.id) {
            const newTroops = Math.max(0, t.troops - 1);
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

  // Use parachute on strategic neutral territory
  if (gameState.cardCooldowns.parachute === 0 && neutralTerritories.length > 0) {
    const strategic = neutralTerritories.find(t => {
      const enemyNeighbors = t.neighbors.filter(nId => {
        const n = gameState.territories.find(ter => ter.id === nId);
        return n && n.owner === 'blue';
      });
      return enemyNeighbors.length >= 2;
    });
    
    if (strategic) {
      showAnimation(`${opponentNickname}: Paracadutista lanciato! 🪂`);
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => 
          t.id === strategic.id ? {...t, owner: 'red', troops: 1} : t
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

  return false;
};

const tryAttackWeakEnemy = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  handleCombat: (attackerId: string, defenderId: string, attackerTroops: number) => void,
  myTerritories: Territory[],
  enemyTerritories: Territory[]
): boolean => {
  for (const myTerritory of myTerritories) {
    if (myTerritory.troops < 2) continue;

    const enemyNeighbors = myTerritory.neighbors
      .map(nId => gameState.territories.find(t => t.id === nId))
      .filter(t => t && t.owner === 'blue') as Territory[];

    for (const enemy of enemyNeighbors) {
      if (myTerritory.troops > enemy.troops + 1) {
        const attackTroops = myTerritory.troops - 1;
        handleCombat(myTerritory.id, enemy.id, attackTroops);
        return true;
      }
    }
  }

  return false;
};

const tryExpandToNeutral = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  myTerritories: Territory[],
  neutralTerritories: Territory[]
): boolean => {
  for (const myTerritory of myTerritories) {
    if (myTerritory.troops < 2) continue;

    const neutralNeighbors = myTerritory.neighbors
      .map(nId => gameState.territories.find(t => t.id === nId))
      .filter(t => t && !t.owner) as Territory[];

    if (neutralNeighbors.length > 0) {
      const target = neutralNeighbors[0];
      const moveTroops = myTerritory.troops - 1;

      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => {
          if (t.id === myTerritory.id) {
            return {...t, troops: 1};
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

const tryConsolidateTroops = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  myTerritories: Territory[]
): boolean => {
  const weakTerritories = myTerritories.filter(t => t.troops >= 2 && t.troops < 4);
  
  for (const weak of weakTerritories) {
    const friendlyNeighbors = weak.neighbors
      .map(nId => gameState.territories.find(t => t.id === nId))
      .filter(t => t && t.owner === 'red') as Territory[];

    const strongNeighbor = friendlyNeighbors.find(t => t.troops > weak.troops);
    
    if (strongNeighbor) {
      const moveTroops = weak.troops - 1;

      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t => {
          if (t.id === weak.id) {
            return {...t, troops: 1};
          }
          if (t.id === strongNeighbor.id) {
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
