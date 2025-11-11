import { Territory } from "./territoryGenerator";

export interface BattleResult {
  winner: 'attacker' | 'defender' | 'draw';
  survivingTroops: number;
  message: string;
}

export const simulateBattle = (
  attackerTroops: number,
  defenderTroops: number,
  attackerBoosted: boolean,
  defenderBoosted: boolean
): BattleResult => {
  // Both boosted - normal rules
  if (attackerBoosted && defenderBoosted) {
    if (attackerTroops > defenderTroops) {
      return {
        winner: 'attacker',
        survivingTroops: attackerTroops - defenderTroops,
        message: `⚔️ Vittoria! ${attackerTroops - defenderTroops} truppe sopravvivono`
      };
    } else if (defenderTroops > attackerTroops) {
      return {
        winner: 'defender',
        survivingTroops: defenderTroops - attackerTroops,
        message: `🛡️ Difesa riuscita! ${defenderTroops - attackerTroops} truppe sopravvivono`
      };
    } else {
      return {
        winner: 'draw',
        survivingTroops: 0,
        message: '⚔️ Pareggio! Tutte le truppe cadono'
      };
    }
  }

  // Attacker boosted
  if (attackerBoosted) {
    if (attackerTroops === 1 && defenderTroops === 1) {
      return {
        winner: 'attacker',
        survivingTroops: 1,
        message: '💪 Truppa potenziata vince!'
      };
    } else if (attackerTroops === 1 && defenderTroops === 2) {
      return {
        winner: 'defender',
        survivingTroops: 1,
        message: '⚔️ Truppa potenziata resiste! 1 vs 1'
      };
    } else if (attackerTroops === 1 && defenderTroops === 3) {
      return {
        winner: 'defender',
        survivingTroops: 1,
        message: '🛡️ Difesa vince ma con perdite pesanti'
      };
    }
  }

  // Defender boosted
  if (defenderBoosted) {
    if (attackerTroops === 1 && defenderTroops === 1) {
      return {
        winner: 'defender',
        survivingTroops: 1,
        message: '💪 Truppa difensiva potenziata resiste!'
      };
    } else if (attackerTroops === 2 && defenderTroops === 1) {
      return {
        winner: 'draw',
        survivingTroops: 1,
        message: '⚔️ Parità! 1 vs 1 rimangono'
      };
    } else if (attackerTroops === 3 && defenderTroops === 1) {
      return {
        winner: 'attacker',
        survivingTroops: 1,
        message: '⚔️ Vittoria ma con gravi perdite'
      };
    }
  }

  // Normal combat
  if (attackerTroops === defenderTroops) {
    return {
      winner: 'draw',
      survivingTroops: 0,
      message: `⚔️ Battaglia epica! Tutte le ${attackerTroops + defenderTroops} truppe cadono`
    };
  } else if (attackerTroops > defenderTroops) {
    return {
      winner: 'attacker',
      survivingTroops: attackerTroops - defenderTroops,
      message: `⚔️ Vittoria! ${attackerTroops - defenderTroops} truppe sopravvivono`
    };
  } else {
    return {
      winner: 'defender',
      survivingTroops: defenderTroops - attackerTroops,
      message: `🛡️ Difesa! ${defenderTroops - attackerTroops} truppe sopravvivono`
    };
  }
};

export const canMoveTroops = (
  source: Territory,
  target: Territory,
  allTerritories: Territory[]
): boolean => {
  // Deve avere truppe da muovere
  if (source.troops === 0) {
    console.log("❌ Nessuna truppa da muovere");
    return false;
  }

  // Se sono vicini secondo la mappa, ok
  if (source.neighbors.includes(target.id)) {
    console.log(`✓ Vicini (mappa): ${source.name} -> ${target.name}`);
    return true;
  }

  // Stradine esplicite per nome (ponti strategici)
  const roadNamePairs: [string, string][] = [
    ['Baia Nebbiosa', 'Bosco Incantato'],
    ['Giungla Fitta', 'Pianura Fertile'],
    ['Mare Interno', 'Terre Ghiacciate'],
    ['Mare Interno', 'Savana Dorata'],
    ['Mare Interno', 'Bosco Incantato'],
    ['Fiume Lungo', 'Mare Interno'],
    ['Giungla Fitta', 'Valle Oscura'],
    ['Laguna Azzurra', 'Pianura Fertile'],
    ['Altopiano', 'Lago Cristallo'],
    ['Savana Dorata', 'Aeroporto'],
    ['Isola Vulcanica', 'Bunker Sotterraneo'],
    ['Torre di Guardia', 'Fortezza'],
    ['Torre di Guardia', 'Montagna Sacra'],
    ['Lago Cristallo', 'Terre Ghiacciate'],
    ['Lago Cristallo', 'Canyon Rosso'],
  ];

  const isRoadLinked = roadNamePairs.some(([a, b]) =>
    (source.name === a && target.name === b) || (source.name === b && target.name === a)
  );
  if (isRoadLinked) {
    console.log(`✓ Collegati da stradina: ${source.name} -> ${target.name}`);
    return true;
  }

  console.log(`❌ Non adiacenti: ${source.name} -> ${target.name}`);
  console.log(`Vicini di "${source.name}":`, source.neighbors.map(id => {
    const t = allTerritories.find(x => x.id === id);
    return t ? t.name : id;
  }));
  return false;
};

export const findPath = (
  fromId: string,
  toId: string,
  territories: Territory[],
  owner: 'blue' | 'red'
): string[] | null => {
  const visited = new Set<string>();
  const queue: [string, string[]][] = [[fromId, [fromId]]];
  
  while (queue.length > 0) {
    const [currentId, path] = queue.shift()!;
    
    if (currentId === toId) return path;
    if (visited.has(currentId)) continue;
    
    visited.add(currentId);
    const current = territories.find(t => t.id === currentId);
    if (!current) continue;
    
    for (const neighborId of current.neighbors) {
      const neighbor = territories.find(t => t.id === neighborId);
      if (neighbor && (neighbor.owner === owner || !neighbor.owner) && !visited.has(neighborId)) {
        queue.push([neighborId, [...path, neighborId]]);
      }
    }
  }
  
  return null;
};
