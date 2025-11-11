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

// Genera una forma di territorio organica e irregolare tipo continente
const generateTerritoryPath = (centerX: number, centerY: number, size: number, seed: number): string => {
  const points: [number, number][] = [];
  const numPoints = 12; // Più punti per forme più complesse
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    // Variazioni più pronunciate per forme irregolari tipo coste
    const radiusVariation = 0.6 + Math.sin(seed * 137 + i * 5.7) * 0.35 + Math.cos(seed * 73 + i * 3.3) * 0.15;
    const angleJitter = (Math.sin(seed * 191 + i * 7.1) * 0.15);
    
    const x = centerX + Math.cos(angle + angleJitter) * size * radiusVariation;
    const y = centerY + Math.sin(angle + angleJitter) * size * radiusVariation * 0.95; // Leggermente più piatto
    points.push([x, y]);
  }
  
  // Usa curve di Bezier per forme più morbide tipo geografiche
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const nextNext = points[(i + 2) % points.length];
    
    // Punto di controllo per curva morbida
    const cpX = (next[0] + current[0]) / 2 + (Math.sin(seed * 113 + i) * size * 0.1);
    const cpY = (next[1] + current[1]) / 2 + (Math.cos(seed * 97 + i) * size * 0.1);
    
    path += ` Q ${cpX} ${cpY}, ${next[0]} ${next[1]}`;
  }
  path += ' Z';
  
  return path;
};

// Territory names - 54 territori
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
  "Fortezza", "Terre Desolate", "Zona Contaminata", "Area Militare",
  "Bunker Sotterraneo", "Porto Abbandonato", "Città Fantasma", "Base Segreta",
  "Laboratorio", "Ospedale", "Centro Commerciale", "Aeroporto",
  "Stazione Ferroviaria", "Centrale Elettrica", "Fabbrica", "Discarica"
];

export const generateTerritories = (): Territory[] => {
  const territories: Territory[] = [];
  
  // Mappa con territori più grandi, attaccati e riempiendo tutta la mappa (viewBox 1300x850)
  // 54 territori totali distribuiti su tutta la mappa
  const continentLayouts = [
    // Nord America (10 territori) - sinistra alto, territori grandi e attaccati
    { x: 120, y: 140, size: 55 }, { x: 210, y: 135, size: 58 }, { x: 300, y: 145, size: 56 }, { x: 390, y: 140, size: 54 },
    { x: 130, y: 240, size: 60 }, { x: 225, y: 235, size: 62 }, { x: 320, y: 240, size: 60 }, { x: 405, y: 235, size: 58 },
    { x: 180, y: 340, size: 58 }, { x: 280, y: 345, size: 60 },
    
    // Sud America (8 territori) - sinistra basso, territori grandi che riempiono
    { x: 190, y: 450, size: 62 }, { x: 290, y: 455, size: 64 }, { x: 380, y: 460, size: 60 },
    { x: 170, y: 560, size: 65 }, { x: 270, y: 565, size: 68 }, { x: 360, y: 570, size: 64 },
    { x: 220, y: 680, size: 66 }, { x: 320, y: 685, size: 64 },
    
    // Europa (9 territori) - centro alto, territori compatti
    { x: 520, y: 120, size: 52 }, { x: 610, y: 125, size: 54 }, { x: 700, y: 120, size: 52 }, { x: 790, y: 125, size: 50 },
    { x: 505, y: 210, size: 56 }, { x: 600, y: 215, size: 58 }, { x: 695, y: 210, size: 56 }, { x: 780, y: 215, size: 54 },
    { x: 600, y: 305, size: 54 },
    
    // Africa (9 territori) - centro, territori grandi
    { x: 520, y: 400, size: 60 }, { x: 620, y: 405, size: 62 }, { x: 720, y: 400, size: 60 },
    { x: 500, y: 510, size: 64 }, { x: 610, y: 515, size: 68 }, { x: 715, y: 510, size: 64 },
    { x: 480, y: 630, size: 66 }, { x: 590, y: 635, size: 70 }, { x: 695, y: 630, size: 66 },
    
    // Asia (12 territori) - destra, massa grande
    { x: 880, y: 115, size: 58 }, { x: 980, y: 120, size: 60 }, { x: 1080, y: 115, size: 58 }, { x: 1180, y: 120, size: 56 },
    { x: 860, y: 220, size: 62 }, { x: 970, y: 225, size: 64 }, { x: 1075, y: 220, size: 62 }, { x: 1170, y: 225, size: 60 },
    { x: 880, y: 330, size: 64 }, { x: 985, y: 335, size: 66 }, { x: 1090, y: 330, size: 64 }, { x: 1185, y: 335, size: 62 },
    
    // Oceania (6 territori) - basso destra, riempiamo lo spazio
    { x: 920, y: 480, size: 58 }, { x: 1030, y: 485, size: 60 }, { x: 1135, y: 480, size: 58 },
    { x: 900, y: 595, size: 62 }, { x: 1010, y: 600, size: 65 }, { x: 1115, y: 595, size: 62 }
  ];

  // Genera i 54 territori con le posizioni definite
  continentLayouts.forEach((layout, index) => {
    const id = `t${index}`;
    const seed = index / 54;
    
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
  
  // Definisci connessioni realistiche tra territori (54 totali) - molti territori contigui
  const connections: [number, number[]][] = [
    // Nord America (0-9) - 10 territori tutti attaccati
    [0, [1, 4, 5]], [1, [0, 2, 5, 6]], [2, [1, 3, 6, 7]], [3, [2, 7]],
    [4, [0, 5, 8]], [5, [0, 1, 4, 6, 8, 9]], [6, [1, 2, 5, 7, 9]], [7, [2, 3, 6]],
    [8, [4, 5, 9, 10]], [9, [5, 6, 8, 11]],
    
    // Sud America (10-17) - 8 territori
    [10, [8, 11, 13, 14]], [11, [9, 10, 12, 14, 15]],
    [12, [11, 15, 17]], [13, [10, 14, 16]], [14, [10, 11, 13, 15, 16]],
    [15, [11, 12, 14, 17]], [16, [13, 14]], [17, [12, 15]],
    
    // Europa (18-26) - 9 territori
    [18, [19, 22, 23]], [19, [18, 20, 23, 24]], [20, [19, 21, 24, 25]], [21, [20, 25]],
    [22, [18, 23, 26, 27]], [23, [18, 19, 22, 24, 26]], [24, [19, 20, 23, 25, 26]],
    [25, [20, 21, 24]], [26, [22, 23, 24, 27]],
    
    // Africa (27-35) - 9 territori
    [27, [22, 26, 28, 31, 32]], [28, [27, 29, 32, 33]], [29, [28, 33]],
    [30, [31, 34]], [31, [27, 30, 32, 34, 35]], [32, [27, 28, 31, 33, 35]],
    [33, [28, 29, 32, 35]], [34, [30, 31, 35]], [35, [31, 32, 33, 34]],
    
    // Asia (36-47) - 12 territori
    [36, [37, 40, 41]], [37, [36, 38, 41, 42]], [38, [37, 39, 42, 43]], [39, [38, 43]],
    [40, [36, 41, 44, 45]], [41, [36, 37, 40, 42, 45, 46]], [42, [37, 38, 41, 43, 46, 47]],
    [43, [38, 39, 42, 47]], [44, [40, 45, 48]], [45, [40, 41, 44, 46, 48, 49]],
    [46, [41, 42, 45, 47, 49, 50]], [47, [42, 43, 46, 50]],
    
    // Oceania (48-53) - 6 territori
    [48, [44, 49, 51]], [49, [45, 46, 48, 50, 51, 52]],
    [50, [46, 47, 49, 52, 53]], [51, [48, 49, 52]],
    [52, [49, 50, 51, 53]], [53, [50, 52]],
    
    // Collegamenti tra continenti distanti
    [3, [36]], // Nord America -> Asia (Alaska-Kamchatka)
    [9, [18]], // Nord America -> Europa
    [21, [36]], // Europa -> Asia (Medio Oriente)
    [26, [40]], // Europa -> Asia
    [29, [44]], // Africa -> Asia
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
    .map(t => ({ id: t.id, x: t.x, y: t.y }));
  
  if (available.length < 5) return [];
  
  let startTerritory;
  
  if (player === 'blue') {
    // Blue starts in the left side of the map (x < 500)
    const leftSide = available.filter(t => t.x < 500);
    if (leftSide.length === 0) return [];
    startTerritory = leftSide[Math.floor(Math.random() * leftSide.length)];
  } else {
    // Red starts in the right side of the map (x > 800)
    const rightSide = available.filter(t => t.x > 800);
    if (rightSide.length === 0) return [];
    startTerritory = rightSide[Math.floor(Math.random() * rightSide.length)];
  }
  
  const startId = startTerritory.id;
  const selected = [startId];
  
  // Find 4 more nearby territories
  let candidates = [startId];
  while (selected.length < 5 && candidates.length > 0) {
    const current = candidates.shift()!;
    const territory = territories.find(t => t.id === current);
    if (!territory) continue;
    
    for (const neighborId of territory.neighbors) {
      if (!selected.includes(neighborId) && !excludeIds.includes(neighborId) && available.some(a => a.id === neighborId)) {
        selected.push(neighborId);
        candidates.push(neighborId);
        if (selected.length >= 5) break;
      }
    }
  }
  
  return selected.slice(0, 5);
};
