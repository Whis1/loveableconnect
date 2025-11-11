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

// Genera una forma di territorio con seed FISSO per avere sempre la stessa forma
const generateTerritoryPath = (centerX: number, centerY: number, size: number, territoryIndex: number): string => {
  const points: [number, number][] = [];
  const numPoints = 12;
  
  // Usa l'indice del territorio come seed fisso invece di un seed variabile
  const fixedSeed = territoryIndex * 0.0185; // Seed deterministico basato sull'indice
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    // Variazioni fisse basate sull'indice del territorio
    const radiusVariation = 0.6 + Math.sin(fixedSeed * 137 + i * 5.7) * 0.35 + Math.cos(fixedSeed * 73 + i * 3.3) * 0.15;
    const angleJitter = (Math.sin(fixedSeed * 191 + i * 7.1) * 0.15);
    
    const x = centerX + Math.cos(angle + angleJitter) * size * radiusVariation;
    const y = centerY + Math.sin(angle + angleJitter) * size * radiusVariation * 0.95;
    points.push([x, y]);
  }
  
  // Usa curve di Bezier per forme morbide
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    
    // Punto di controllo fisso per curva morbida
    const cpX = (next[0] + current[0]) / 2 + (Math.sin(fixedSeed * 113 + i) * size * 0.1);
    const cpY = (next[1] + current[1]) / 2 + (Math.cos(fixedSeed * 97 + i) * size * 0.1);
    
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
  
  // Mappa super-compatta - territori sovrapposti per massa unica
  const continentLayouts = [
    // Nord America (10 territori) - gruppo ultra-compatto sinistra alto
    { x: 210, y: 190, size: 65 }, { x: 290, y: 185, size: 68 }, { x: 370, y: 190, size: 65 }, { x: 450, y: 185, size: 63 },
    { x: 220, y: 275, size: 70 }, { x: 305, y: 270, size: 72 }, { x: 390, y: 275, size: 70 }, { x: 470, y: 270, size: 68 },
    { x: 265, y: 365, size: 68 }, { x: 355, y: 370, size: 70 },
    
    // Sud America (8 territori) - sovrapposto a Nord America
    { x: 210, y: 460, size: 72 }, { x: 300, y: 465, size: 74 }, { x: 385, y: 470, size: 70 },
    { x: 190, y: 560, size: 75 }, { x: 285, y: 565, size: 78 }, { x: 375, y: 570, size: 74 },
    { x: 240, y: 665, size: 76 }, { x: 335, y: 670, size: 74 },
    
    // Europa (9 territori) - sovrapposta e attaccata a Nord America
    { x: 565, y: 170, size: 62 }, { x: 645, y: 175, size: 64 }, { x: 725, y: 170, size: 62 }, { x: 805, y: 175, size: 60 },
    { x: 550, y: 260, size: 66 }, { x: 635, y: 265, size: 68 }, { x: 720, y: 260, size: 66 }, { x: 800, y: 265, size: 64 },
    { x: 635, y: 355, size: 64 },
    
    // Africa (9 territori) - sovrapposta a Europa
    { x: 560, y: 450, size: 70 }, { x: 650, y: 455, size: 72 }, { x: 740, y: 450, size: 70 },
    { x: 540, y: 550, size: 74 }, { x: 640, y: 555, size: 78 }, { x: 735, y: 550, size: 74 },
    { x: 520, y: 655, size: 76 }, { x: 625, y: 660, size: 80 }, { x: 720, y: 655, size: 76 },
    
    // Asia (12 territori) - completamente sovrapposta a Europa
    { x: 900, y: 165, size: 68 }, { x: 990, y: 170, size: 70 }, { x: 1080, y: 165, size: 68 }, { x: 1170, y: 170, size: 66 },
    { x: 885, y: 260, size: 72 }, { x: 980, y: 265, size: 74 }, { x: 1075, y: 260, size: 72 }, { x: 1165, y: 265, size: 70 },
    { x: 900, y: 360, size: 74 }, { x: 1000, y: 365, size: 76 }, { x: 1095, y: 360, size: 74 }, { x: 1185, y: 365, size: 72 },
    
    // Oceania (6 territori) - attaccata ad Asia
    { x: 945, y: 470, size: 68 }, { x: 1045, y: 475, size: 70 }, { x: 1140, y: 470, size: 68 },
    { x: 925, y: 575, size: 72 }, { x: 1030, y: 580, size: 75 }, { x: 1130, y: 575, size: 72 }
  ];

  // Genera i 54 territori con le posizioni FISSE definite
  continentLayouts.forEach((layout, index) => {
    const id = `t${index}`;
    
    // Usa l'indice come seed per generare SEMPRE la stessa forma
    const path = generateTerritoryPath(layout.x, layout.y, layout.size, index);
    
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
  
  // Collegamenti tra territori - mappa unica con solo 4 collegamenti distanti con stradine
  const connections: [number, number[]][] = [
    // Nord America (0-9) - tutti attaccati
    [0, [1, 4, 5]], [1, [0, 2, 5, 6]], [2, [1, 3, 6, 7]], [3, [2, 7]],
    [4, [0, 5, 8]], [5, [0, 1, 4, 6, 8, 9]], [6, [1, 2, 5, 7, 9]], [7, [2, 3, 6]],
    [8, [4, 5, 9]], [9, [5, 6, 8, 10, 11, 18]], // Collegato a Sud America ed Europa
    
    // Sud America (10-17) - attaccato a Nord America
    [10, [9, 11, 13, 14]], [11, [9, 10, 12, 14, 15]],
    [12, [11, 15, 17]], [13, [10, 14, 16]], [14, [10, 11, 13, 15, 16]],
    [15, [11, 12, 14, 17]], [16, [13, 14]], [17, [12, 15]],
    
    // Europa (18-26) - attaccata a Nord America e Africa
    [18, [9, 19, 22, 23]], [19, [18, 20, 23, 24]], [20, [19, 21, 24, 25]], [21, [20, 25, 36]], // Collegata ad Asia
    [22, [18, 23, 26, 27]], [23, [18, 19, 22, 24, 26]], [24, [19, 20, 23, 25, 26]],
    [25, [20, 21, 24]], [26, [22, 23, 24, 27, 28]], // Collegata ad Africa
    
    // Africa (27-35) - attaccata a Europa
    [27, [22, 26, 28, 31, 32]], [28, [26, 27, 29, 32, 33]], [29, [28, 33, 36]], // Collegata ad Asia
    [30, [31, 34]], [31, [27, 30, 32, 34, 35]], [32, [27, 28, 31, 33, 35]],
    [33, [28, 29, 32, 35]], [34, [30, 31, 35]], [35, [31, 32, 33, 34]],
    
    // Asia (36-47) - attaccata a Europa e Africa
    [36, [21, 29, 37, 40, 41]], [37, [36, 38, 41, 42]], [38, [37, 39, 42, 43]], [39, [38, 43]],
    [40, [36, 41, 44, 45]], [41, [36, 37, 40, 42, 45, 46]], [42, [37, 38, 41, 43, 46, 47]],
    [43, [38, 39, 42, 47]], [44, [40, 45]], [45, [40, 41, 44, 46]],
    [46, [41, 42, 45, 47, 48]], [47, [42, 43, 46, 48]], // Collegata a Oceania con stradina
    
    // Oceania (48-53) - collegata ad Asia con stradina
    [48, [46, 47, 49, 51]], [49, [48, 50, 51, 52]],
    [50, [49, 52, 53]], [51, [48, 49, 52]],
    [52, [49, 50, 51, 53]], [53, [50, 52]],
    
    // 4 COLLEGAMENTI CON STRADINE (distanti):
    // 1. Nord America (3) -> Asia (36) - Stretto di Bering
    [3, [36]],
    // 2. Sud America (17) -> Africa (35) - Atlantico Sud  
    [17, [35]],
    // 3. Africa (30) -> Oceania (53) - Oceano Indiano
    [30, [53]],
    // 4. Nord America (0) -> Europa (18) - Atlantico Nord (già collegato tramite territorio 9)
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
