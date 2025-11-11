export interface Territory {
  id: string;
  name: string;
  x: number;
  y: number;
  path: string;
  neighbors: string[];
  owner: 'blue' | 'red' | null;
  troops: number;
  size: number;
}

// Forme dei continenti basate sul vero Risiko
const getContinentShape = (continentId: number, centerX: number, centerY: number, scale: number): string => {
  const shapes: { [key: number]: string } = {
    // Nord America - forma irregolare con Alaska
    0: `M ${centerX - 80*scale} ${centerY - 60*scale} 
        L ${centerX - 50*scale} ${centerY - 80*scale} 
        L ${centerX - 10*scale} ${centerY - 85*scale} 
        L ${centerX + 30*scale} ${centerY - 70*scale} 
        L ${centerX + 50*scale} ${centerY - 40*scale} 
        L ${centerX + 55*scale} ${centerY + 10*scale} 
        L ${centerX + 40*scale} ${centerY + 50*scale} 
        L ${centerX + 10*scale} ${centerY + 70*scale} 
        L ${centerX - 30*scale} ${centerY + 65*scale} 
        L ${centerX - 60*scale} ${centerY + 40*scale} 
        L ${centerX - 75*scale} ${centerY} 
        L ${centerX - 85*scale} ${centerY - 30*scale} Z`,
    
    // Sud America - forma verticale allungata
    1: `M ${centerX - 30*scale} ${centerY - 50*scale} 
        L ${centerX + 20*scale} ${centerY - 55*scale} 
        L ${centerX + 40*scale} ${centerY - 30*scale} 
        L ${centerX + 35*scale} ${centerY + 10*scale} 
        L ${centerX + 20*scale} ${centerY + 50*scale} 
        L ${centerX} ${centerY + 80*scale} 
        L ${centerX - 25*scale} ${centerY + 75*scale} 
        L ${centerX - 40*scale} ${centerY + 40*scale} 
        L ${centerX - 35*scale} ${centerY - 10*scale} Z`,
    
    // Europa - forma compatta con penisole
    2: `M ${centerX - 40*scale} ${centerY - 50*scale} 
        L ${centerX - 10*scale} ${centerY - 65*scale} 
        L ${centerX + 30*scale} ${centerY - 60*scale} 
        L ${centerX + 50*scale} ${centerY - 40*scale} 
        L ${centerX + 55*scale} ${centerY - 10*scale} 
        L ${centerX + 45*scale} ${centerY + 30*scale} 
        L ${centerX + 20*scale} ${centerY + 55*scale} 
        L ${centerX - 10*scale} ${centerY + 50*scale} 
        L ${centerX - 35*scale} ${centerY + 30*scale} 
        L ${centerX - 50*scale} ${centerY} 
        L ${centerX - 45*scale} ${centerY - 30*scale} Z`,
    
    // Africa - forma larga in alto e stretta in basso
    3: `M ${centerX - 40*scale} ${centerY - 60*scale} 
        L ${centerX + 10*scale} ${centerY - 70*scale} 
        L ${centerX + 50*scale} ${centerY - 55*scale} 
        L ${centerX + 60*scale} ${centerY - 20*scale} 
        L ${centerX + 55*scale} ${centerY + 30*scale} 
        L ${centerX + 35*scale} ${centerY + 65*scale} 
        L ${centerX + 10*scale} ${centerY + 80*scale} 
        L ${centerX - 15*scale} ${centerY + 75*scale} 
        L ${centerX - 40*scale} ${centerY + 50*scale} 
        L ${centerX - 50*scale} ${centerY + 10*scale} 
        L ${centerX - 48*scale} ${centerY - 30*scale} Z`,
    
    // Asia - forma grande e complessa
    4: `M ${centerX - 70*scale} ${centerY - 70*scale} 
        L ${centerX - 20*scale} ${centerY - 85*scale} 
        L ${centerX + 40*scale} ${centerY - 80*scale} 
        L ${centerX + 80*scale} ${centerY - 60*scale} 
        L ${centerX + 90*scale} ${centerY - 20*scale} 
        L ${centerX + 85*scale} ${centerY + 25*scale} 
        L ${centerX + 65*scale} ${centerY + 55*scale} 
        L ${centerX + 30*scale} ${centerY + 70*scale} 
        L ${centerX - 10*scale} ${centerY + 65*scale} 
        L ${centerX - 45*scale} ${centerY + 45*scale} 
        L ${centerX - 70*scale} ${centerY + 15*scale} 
        L ${centerX - 75*scale} ${centerY - 30*scale} Z`,
    
    // Oceania - forma a isole
    5: `M ${centerX - 35*scale} ${centerY - 40*scale} 
        L ${centerX + 15*scale} ${centerY - 45*scale} 
        L ${centerX + 45*scale} ${centerY - 30*scale} 
        L ${centerX + 50*scale} ${centerY + 10*scale} 
        L ${centerX + 40*scale} ${centerY + 45*scale} 
        L ${centerX + 10*scale} ${centerY + 60*scale} 
        L ${centerX - 20*scale} ${centerY + 55*scale} 
        L ${centerX - 45*scale} ${centerY + 30*scale} 
        L ${centerX - 50*scale} ${centerY - 10*scale} Z`
  };
  
  return shapes[continentId] || shapes[0];
};

// Genera una forma di territorio più piccola dentro il continente
const generateTerritoryPath = (centerX: number, centerY: number, size: number, seed: number): string => {
  const points: [number, number][] = [];
  const numPoints = 8;
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const radiusVariation = 0.7 + Math.sin(seed * 100 + i * 3) * 0.3;
    
    const x = centerX + Math.cos(angle) * size * radiusVariation;
    const y = centerY + Math.sin(angle) * size * radiusVariation;
    points.push([x, y]);
  }
  
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    path += ` L ${next[0]} ${next[1]}`;
  }
  path += ' Z';
  
  return path;
};

// Territory names
const territoryNames = [
  "Città Perduta", "Isola d'Elbagian", "Porto Antico", "Valle Oscura",
  "Montagne Gelate", "Deserto Rosso", "Foresta Nera", "Laguna Azzurra",
  "Castello Reale", "Piana Verde", "Vulcano Attivo", "Penisola Sud",
  "Arcipelago Nord", "Terra Sacra", "Miniere d'Oro", "Roccaforte",
  "Baia Nebbiosa", "Altopiano", "Giungla Fitta", "Steppa Infinita",
  "Oasi Nascosta", "Grotte Profonde", "Pianura Fertile", "Costa Selvaggia",
  "Borgo Antico", "Torre di Guardia", "Fiume Lungo", "Colline Verdi",
  "Mare Interno", "Isola Vulcanica", "Terre Ghiacciate", "Canyon Rosso",
  "Savana Dorata", "Lago Cristallo", "Bosco Incantato", "Delta Paludoso",
  "Montagna Sacra", "Villaggio Perduto", "Promontorio", "Baia dei Pirati",
  "Fortezza", "Terre Desolate"
];

export const generateTerritories = (): Territory[] => {
  const territories: Territory[] = [];
  
  // Mappa tipo Risiko con continenti realistici e molto più grandi
  // Definisco le posizioni dei 42 territori in 6 continenti
  const continentLayouts = [
    // Nord America (9 territori) - alto sinistra, molto più grande
    { x: 200, y: 150, size: 45 }, { x: 280, y: 120, size: 42 }, { x: 360, y: 135, size: 44 },
    { x: 185, y: 230, size: 48 }, { x: 270, y: 215, size: 46 }, { x: 360, y: 230, size: 45 },
    { x: 205, y: 310, size: 42 }, { x: 285, y: 300, size: 44 }, { x: 365, y: 320, size: 40 },
    
    // Sud America (4 territori) - basso sinistra, più grande
    { x: 250, y: 480, size: 52 }, { x: 330, y: 500, size: 50 },
    { x: 270, y: 590, size: 48 }, { x: 340, y: 610, size: 46 },
    
    // Europa (7 territori) - centro alto, più grande
    { x: 520, y: 110, size: 40 }, { x: 600, y: 120, size: 42 }, { x: 680, y: 115, size: 38 },
    { x: 495, y: 190, size: 44 }, { x: 585, y: 200, size: 46 }, { x: 675, y: 195, size: 42 },
    { x: 595, y: 270, size: 40 },
    
    // Africa (6 territori) - centro, molto più grande
    { x: 540, y: 360, size: 50 }, { x: 630, y: 370, size: 52 }, { x: 720, y: 365, size: 48 },
    { x: 555, y: 470, size: 54 }, { x: 645, y: 485, size: 56 }, { x: 725, y: 480, size: 50 },
    
    // Asia (12 territori) - destra alto, molto più grande
    { x: 810, y: 95, size: 48 }, { x: 900, y: 105, size: 50 }, { x: 990, y: 100, size: 46 }, { x: 1080, y: 110, size: 44 },
    { x: 785, y: 185, size: 52 }, { x: 880, y: 195, size: 54 }, { x: 980, y: 190, size: 50 }, { x: 1075, y: 200, size: 48 },
    { x: 815, y: 285, size: 52 }, { x: 915, y: 295, size: 54 }, { x: 1015, y: 290, size: 50 }, { x: 1100, y: 300, size: 46 },
    
    // Oceania (4 territori) - basso destra, più grande
    { x: 1000, y: 500, size: 46 }, { x: 1090, y: 510, size: 48 },
    { x: 1020, y: 610, size: 50 }, { x: 1100, y: 620, size: 48 }
  ];

  // Genera i 42 territori con le posizioni definite
  continentLayouts.forEach((layout, index) => {
    const id = `t${index}`;
    const seed = index / 42;
    
    const path = generateTerritoryPath(layout.x, layout.y, layout.size, seed);
    
    territories.push({
      id,
      name: territoryNames[index] || `Territorio ${index + 1}`,
      x: layout.x,
      y: layout.y,
      path,
      neighbors: [],
      owner: null,
      troops: 0,
      size: layout.size
    });
  });
  
  // Definisci connessioni realistiche tra territori (42 totali)
  const connections: [number, number[]][] = [
    // Nord America (0-8)
    [0, [1, 3]], [1, [0, 2, 4]], [2, [1, 5]],
    [3, [0, 4, 6]], [4, [1, 3, 5, 7]], [5, [2, 4, 8]],
    [6, [3, 7, 9]], [7, [4, 6, 8, 10]], [8, [5, 7, 11]],
    
    // Sud America (9-12)
    [9, [6, 10, 12]], [10, [9, 11]], 
    [11, [8, 10, 12]], [12, [9, 11]],
    
    // Europa (13-19)
    [13, [14, 16, 20]], [14, [13, 15, 17]], [15, [14, 18, 21]],
    [16, [13, 17, 19]], [17, [14, 16, 18, 19]], [18, [15, 17, 21]],
    [19, [16, 17, 22]],
    
    // Africa (20-25)
    [20, [13, 21, 23]], [21, [15, 20, 22, 24]], [22, [19, 21, 25]],
    [23, [20, 24]], [24, [21, 23, 25]], [25, [22, 24]],
    
    // Asia (26-37) - 12 territori
    [26, [27, 30]], [27, [26, 28, 31]], [28, [27, 29, 32]], [29, [28, 33]],
    [30, [26, 31, 34]], [31, [27, 30, 32, 35]], [32, [28, 31, 33, 36]], [33, [29, 32, 37]],
    [34, [30, 35, 38]], [35, [31, 34, 36, 39]], [36, [32, 35, 37, 40]], [37, [33, 36, 41]],
    
    // Oceania (38-41) - 4 territori invece di 6, corretto
    [38, [34, 39]], [39, [38, 40]],
    [40, [39, 41]], [41, [37, 40]],
    
    // Collegamenti tra continenti distanti
    [2, [26]], // Nord America -> Asia (Alaska-Kamchatka)
    [8, [13]], // Nord America -> Europa
    [15, [26]], // Europa -> Asia (Medio Oriente)
    [22, [30]], // Africa -> Asia
  ];
  
  connections.forEach(([territoryIndex, neighborIndices]) => {
    const territory = territories[territoryIndex];
    if (territory) {
      neighborIndices.forEach(neighborIndex => {
        const neighborId = `t${neighborIndex}`;
        if (!territory.neighbors.includes(neighborId)) {
          territory.neighbors.push(neighborId);
        }
        // Aggiungi connessione inversa
        const neighbor = territories[neighborIndex];
        if (neighbor && !neighbor.neighbors.includes(territory.id)) {
          neighbor.neighbors.push(territory.id);
        }
      });
    }
  });
  
  // Initialize starting positions
  const blueStarts = selectStartingTerritories(territories, 'blue');
  const redStarts = selectStartingTerritories(territories, 'red', blueStarts);
  
  blueStarts.forEach(id => {
    const t = territories.find(ter => ter.id === id);
    if (t) {
      t.owner = 'blue';
      t.troops = 2;
    }
  });
  
  redStarts.forEach(id => {
    const t = territories.find(ter => ter.id === id);
    if (t) {
      t.owner = 'red';
      t.troops = 2;
    }
  });
  
  return territories;
};

const selectStartingTerritories = (
  territories: Territory[],
  player: 'blue' | 'red',
  excludeIds: string[] = []
): string[] => {
  const available = territories
    .filter(t => !excludeIds.includes(t.id) && !t.owner)
    .map(t => t.id);
  
  if (available.length < 5) return [];
  
  // Select a random starting territory
  const startIndex = Math.floor(Math.random() * available.length);
  const startId = available[startIndex];
  const selected = [startId];
  
  // Find 4 more nearby territories
  let candidates = [startId];
  while (selected.length < 5 && candidates.length > 0) {
    const current = candidates.shift()!;
    const territory = territories.find(t => t.id === current);
    if (!territory) continue;
    
    for (const neighborId of territory.neighbors) {
      if (!selected.includes(neighborId) && !excludeIds.includes(neighborId) && available.includes(neighborId)) {
        selected.push(neighborId);
        candidates.push(neighborId);
        if (selected.length >= 5) break;
      }
    }
  }
  
  return selected.slice(0, 5);
};
