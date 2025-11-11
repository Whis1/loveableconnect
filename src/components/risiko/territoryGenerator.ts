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
  const numPoints = 12; // Numero ridotto per forme più arrotondate
  
  // Usa l'indice del territorio come seed fisso invece di un seed variabile
  const fixedSeed = territoryIndex * 0.0185; // Seed deterministico basato sull'indice
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    // Variazioni più morbide e controllate per evitare punte
    const radiusVariation = 0.75 + 
      Math.sin(fixedSeed * 137 + i * 5.7) * 0.2 + 
      Math.cos(fixedSeed * 73 + i * 3.3) * 0.1;
    const angleJitter = (Math.sin(fixedSeed * 191 + i * 7.1) * 0.08);
    
    const x = centerX + Math.cos(angle + angleJitter) * size * radiusVariation;
    const y = centerY + Math.sin(angle + angleJitter) * size * radiusVariation * 0.9;
    points.push([x, y]);
  }
  
  // Usa curve morbide con punti di controllo più vicini per forme arrotondate
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    
    // Punti di controllo più vicini per curve dolci
    const cpX = (next[0] + current[0]) / 2 + (Math.sin(fixedSeed * 113 + i * 1.3) * size * 0.08);
    const cpY = (next[1] + current[1]) / 2 + (Math.cos(fixedSeed * 97 + i * 1.7) * size * 0.08);
    
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
  
  // Mappa super-compatta - territori enormi che riempiono tutto
  const continentLayouts = [
    // Nord America (10 territori) - gruppo ultra-compatto sinistra alto
    { x: 190, y: 180, size: 110 }, { x: 300, y: 175, size: 115 }, { x: 410, y: 180, size: 110 }, { x: 520, y: 175, size: 108 },
    { x: 200, y: 300, size: 118 }, { x: 315, y: 295, size: 120 }, { x: 430, y: 300, size: 118 }, { x: 540, y: 295, size: 115 },
    { x: 260, y: 425, size: 115 }, { x: 380, y: 430, size: 118 },
    
    // Sud America (8 territori) - sovrapposto a Nord America
    { x: 190, y: 550, size: 120 }, { x: 310, y: 555, size: 125 }, { x: 425, y: 560, size: 118 },
    { x: 170, y: 675, size: 125 }, { x: 295, y: 680, size: 130 }, { x: 415, y: 685, size: 125 },
    { x: 235, y: 800, size: 128 }, { x: 360, y: 805, size: 125 },
    
    // Europa (9 territori) - sovrapposta e attaccata a Nord America
    { x: 650, y: 170, size: 108 }, { x: 760, y: 175, size: 110 }, { x: 870, y: 170, size: 108 }, { x: 980, y: 175, size: 105 },
    { x: 630, y: 290, size: 113 }, { x: 750, y: 295, size: 115 }, { x: 870, y: 290, size: 113 }, { x: 985, y: 295, size: 110 },
    { x: 750, y: 415, size: 110 },
    
    // Africa (9 territori) - sovrapposta a Europa
    { x: 640, y: 540, size: 118 }, { x: 765, y: 545, size: 120 }, { x: 890, y: 540, size: 118 },
    { x: 620, y: 665, size: 125 }, { x: 755, y: 670, size: 130 }, { x: 885, y: 665, size: 125 },
    { x: 600, y: 790, size: 128 }, { x: 740, y: 795, size: 135 }, { x: 875, y: 790, size: 128 },
    
    // Asia (12 territori) - completamente sovrapposta a Europa
    { x: 1075, y: 165, size: 115 }, { x: 1195, y: 170, size: 118 }, { x: 1315, y: 165, size: 115 }, { x: 1435, y: 170, size: 113 },
    { x: 1055, y: 285, size: 120 }, { x: 1180, y: 290, size: 125 }, { x: 1305, y: 285, size: 120 }, { x: 1425, y: 290, size: 118 },
    { x: 1075, y: 410, size: 125 }, { x: 1205, y: 415, size: 128 }, { x: 1330, y: 410, size: 125 }, { x: 1450, y: 415, size: 120 },
    
    // Oceania (6 territori) - attaccata ad Asia
    { x: 1135, y: 545, size: 115 }, { x: 1260, y: 550, size: 118 }, { x: 1380, y: 545, size: 115 },
    { x: 1115, y: 675, size: 120 }, { x: 1245, y: 680, size: 125 }, { x: 1370, y: 675, size: 120 }
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
  
  // Collegamenti tra territori - tutti i collegamenti devono essere completi e bidirezionali
  const connections: [number, number[]][] = [
    // Nord America (0-9) - tutti attaccati tra loro
    [0, [1, 4, 5]], 
    [1, [0, 2, 4, 5, 6]], 
    [2, [1, 3, 5, 6, 7]], 
    [3, [2, 6, 7, 36]], // Collegato ad Asia
    [4, [0, 1, 5, 8, 9]], 
    [5, [0, 1, 2, 4, 6, 8, 9]], 
    [6, [1, 2, 3, 5, 7, 9, 18]], // Collegato ad Europa
    [7, [2, 3, 6]], 
    [8, [4, 5, 9, 10]], // Collegato a Sud America
    [9, [4, 5, 6, 8, 10, 11, 18]], // Collegato a Sud America ed Europa
    
    // Sud America (10-17) - tutti collegati tra loro e a Nord America
    [10, [8, 9, 11, 13, 14]], 
    [11, [9, 10, 12, 14, 15]], 
    [12, [11, 15, 17]], 
    [13, [10, 14, 16]], 
    [14, [10, 11, 13, 15, 16]], 
    [15, [11, 12, 14, 16, 17]], 
    [16, [13, 14, 15, 17]], 
    [17, [12, 15, 16, 35]], // Collegato ad Africa
    
    // Europa (18-26) - tutti collegati completamente tra loro
    [18, [6, 9, 19, 20, 22, 23, 24]], 
    [19, [18, 20, 21, 22, 23, 24, 25]], 
    [20, [18, 19, 21, 22, 23, 24, 25]], 
    [21, [19, 20, 23, 24, 25, 36]], // Collegato ad Asia
    [22, [18, 19, 20, 23, 24, 26, 27]], 
    [23, [18, 19, 20, 21, 22, 24, 25, 26]], 
    [24, [18, 19, 20, 21, 22, 23, 25, 26]], 
    [25, [19, 20, 21, 23, 24, 26]], 
    [26, [22, 23, 24, 25, 27, 28]], // Collegato ad Africa
    
    // Africa (27-35) - tutti collegati tra loro, a Europa
    [27, [22, 26, 28, 30, 31, 32]], 
    [28, [26, 27, 29, 31, 32, 33]], 
    [29, [28, 32, 33, 36]], // Collegato ad Asia
    [30, [27, 31, 34, 53]], // Collegato a Oceania
    [31, [27, 28, 30, 32, 34, 35]], 
    [32, [27, 28, 29, 31, 33, 35]], 
    [33, [28, 29, 32, 34, 35]], 
    [34, [30, 31, 33, 35]], 
    [35, [17, 31, 32, 33, 34]], // Collegato a Sud America
    
    // Asia (36-47) - tutti collegati tra loro, a Europa e Africa
    [36, [3, 21, 29, 37, 40, 41]], 
    [37, [36, 38, 40, 41, 42]], 
    [38, [37, 39, 41, 42, 43]], 
    [39, [38, 42, 43]], 
    [40, [36, 37, 41, 44, 45]], 
    [41, [36, 37, 38, 40, 42, 44, 45, 46]], 
    [42, [37, 38, 39, 41, 43, 46, 47]], 
    [43, [38, 39, 42, 47]], 
    [44, [40, 41, 45, 48]], 
    [45, [40, 41, 44, 46, 48]], 
    [46, [41, 42, 45, 47, 48, 49]], 
    [47, [42, 43, 46, 49]], 
    
    // Oceania (48-53) - tutti collegati tra loro e ad Asia
    [48, [44, 45, 46, 49, 51, 52]], 
    [49, [46, 47, 48, 50, 51, 52]], 
    [50, [49, 51, 52, 53]], 
    [51, [48, 49, 50, 52]], 
    [52, [48, 49, 50, 51, 53]], 
    [53, [30, 50, 52]], // Collegato ad Africa
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
