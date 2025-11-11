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

// Generate realistic geographic territory shapes
const generateContinentPath = (centerX: number, centerY: number, size: number, seed: number): string => {
  const points: [number, number][] = [];
  
  // Create different base shapes for variety
  const shapeType = Math.floor(seed * 5);
  
  if (shapeType === 0) {
    // Elongated horizontal continent (like South America)
    const numPoints = 12;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const horizontalStretch = 1.4 + Math.sin(seed * 100) * 0.3;
      const verticalCompression = 0.7;
      const radiusVariation = 0.6 + Math.sin(seed * 50 + i * 3) * 0.4 + Math.cos(seed * 30 + i * 5) * 0.25;
      
      const x = centerX + Math.cos(angle) * size * radiusVariation * horizontalStretch;
      const y = centerY + Math.sin(angle) * size * radiusVariation * verticalCompression;
      
      // Add peninsulas and bays
      if (i % 3 === 0) {
        const peninsulaExtend = Math.sin(seed * 200 + i) * size * 0.3;
        points.push([x + peninsulaExtend * Math.cos(angle), y + peninsulaExtend * Math.sin(angle)]);
      } else {
        points.push([x, y]);
      }
    }
  } else if (shapeType === 1) {
    // Vertical elongated (like Italy or Chile)
    const numPoints = 14;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const horizontalCompression = 0.6;
      const verticalStretch = 1.5 + Math.cos(seed * 80) * 0.4;
      const radiusVariation = 0.55 + Math.sin(seed * 60 + i * 4) * 0.45;
      
      const x = centerX + Math.cos(angle) * size * radiusVariation * horizontalCompression;
      const y = centerY + Math.sin(angle) * size * radiusVariation * verticalStretch;
      points.push([x, y]);
    }
  } else if (shapeType === 2) {
    // Large blocky continent (like Africa or Australia)
    const numPoints = 10;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radiusVariation = 0.75 + Math.sin(seed * 70 + i * 2) * 0.25;
      
      const x = centerX + Math.cos(angle) * size * radiusVariation;
      const y = centerY + Math.sin(angle) * size * radiusVariation;
      
      // Add irregular edges
      const edgeJitter = Math.sin(seed * 150 + i * 7) * size * 0.2;
      points.push([x + edgeJitter, y + edgeJitter * 0.8]);
    }
  } else if (shapeType === 3) {
    // Archipelago-like (island chains)
    const numPoints = 8;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radiusVariation = 0.5 + Math.sin(seed * 90 + i * 6) * 0.5;
      
      // Create more irregular, island-like shapes
      const irregularity = Math.cos(seed * 120 + i * 4) * size * 0.25;
      const x = centerX + Math.cos(angle) * size * radiusVariation + irregularity;
      const y = centerY + Math.sin(angle) * size * radiusVariation - irregularity * 0.6;
      points.push([x, y]);
    }
  } else {
    // Complex irregular shape (like Europe with many peninsulas)
    const numPoints = 16;
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const baseRadius = 0.65 + Math.sin(seed * 45 + i * 2.5) * 0.35;
      
      // Add complex coastline with bays and peninsulas
      let radiusVariation = baseRadius;
      if (i % 4 === 0) {
        radiusVariation *= 1.3; // Peninsula
      } else if (i % 4 === 2) {
        radiusVariation *= 0.7; // Bay
      }
      
      const x = centerX + Math.cos(angle) * size * radiusVariation;
      const y = centerY + Math.sin(angle) * size * radiusVariation;
      
      // Add coastal irregularity
      const coastalJitter = Math.sin(seed * 180 + i * 9) * size * 0.15;
      points.push([x + coastalJitter, y + coastalJitter * 0.7]);
    }
  }
  
  // Create smooth paths with Bezier curves for natural coastlines
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const nextNext = points[(i + 2) % points.length];
    
    // Use quadratic curves for smoother, more natural looking borders
    const cpx = next[0];
    const cpy = next[1];
    path += ` Q ${cpx} ${cpy} ${(next[0] + nextNext[0]) / 2} ${(next[1] + nextNext[1]) / 2}`;
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
  
  // Mappa tipo Risiko con continenti realistici
  // Definisco le posizioni dei 42 territori in 6 continenti
  const continentLayouts = [
    // Nord America (9 territori) - alto sinistra
    { x: 150, y: 120, size: 55 }, { x: 220, y: 100, size: 50 }, { x: 290, y: 110, size: 52 },
    { x: 140, y: 190, size: 58 }, { x: 220, y: 180, size: 56 }, { x: 300, y: 190, size: 54 },
    { x: 160, y: 260, size: 50 }, { x: 230, y: 250, size: 52 }, { x: 300, y: 270, size: 48 },
    
    // Sud America (4 territori) - basso sinistra
    { x: 200, y: 380, size: 60 }, { x: 270, y: 400, size: 58 },
    { x: 220, y: 480, size: 56 }, { x: 280, y: 500, size: 54 },
    
    // Europa (7 territori) - centro alto
    { x: 450, y: 90, size: 48 }, { x: 520, y: 100, size: 50 }, { x: 590, y: 95, size: 46 },
    { x: 430, y: 160, size: 52 }, { x: 510, y: 170, size: 54 }, { x: 590, y: 165, size: 50 },
    { x: 520, y: 230, size: 48 },
    
    // Africa (6 territori) - centro
    { x: 470, y: 300, size: 58 }, { x: 550, y: 310, size: 60 }, { x: 630, y: 305, size: 56 },
    { x: 480, y: 390, size: 62 }, { x: 560, y: 400, size: 64 }, { x: 630, y: 395, size: 58 },
    
    // Asia (10 territori) - destra alto
    { x: 720, y: 80, size: 56 }, { x: 800, y: 90, size: 58 }, { x: 880, y: 85, size: 54 },
    { x: 700, y: 160, size: 60 }, { x: 780, y: 170, size: 62 }, { x: 870, y: 165, size: 58 },
    { x: 960, y: 160, size: 56 }, { x: 730, y: 250, size: 60 }, { x: 820, y: 260, size: 62 },
    { x: 910, y: 255, size: 58 },
    
    // Oceania (6 territori) - basso destra
    { x: 880, y: 380, size: 52 }, { x: 960, y: 390, size: 54 },
    { x: 860, y: 460, size: 50 }, { x: 940, y: 470, size: 52 },
    { x: 900, y: 550, size: 56 }, { x: 980, y: 560, size: 54 }
  ];

  // Genera i 42 territori con le posizioni definite
  continentLayouts.forEach((layout, index) => {
    const id = `t${index}`;
    const seed = index / 42;
    
    const path = generateContinentPath(layout.x, layout.y, layout.size, seed);
    
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
  
  // Definisci connessioni realistiche tra territori
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
    
    // Asia (26-35)
    [26, [27, 29, 31]], [27, [26, 28, 30]], [28, [27, 32]],
    [29, [26, 30, 33]], [30, [27, 29, 31, 34]], [31, [26, 30, 32, 35]],
    [32, [28, 31, 36]], [33, [29, 34, 37]], [34, [30, 33, 35, 38]],
    [35, [31, 34, 36, 39]],
    
    // Oceania (36-41)
    [36, [32, 37]], [37, [33, 36, 38]], 
    [38, [34, 37, 39, 40]], [39, [35, 38, 41]],
    [40, [38, 41]], [41, [39, 40]],
    
    // Collegamenti tra continenti distanti
    [2, [26]], // Nord America -> Asia (Alaska-Siberia)
    [8, [13]], // Nord America -> Europa
    [15, [26]], // Europa -> Asia
    [22, [29]], // Africa -> Asia (Medio Oriente)
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
