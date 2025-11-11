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
  
  // Grid layout: 6 rows x 7 columns = 42 territories
  const rows = 6;
  const cols = 7;
  const spacingX = 128;
  const spacingY = 102;
  const offsetX = 75;
  const offsetY = 75;
  
  // Generate 42 territories with much more varied sizes for realism
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const id = `t${index}`;
      const seed = index / 42;
      
      // Create varied continent sizes - some large, some small like real geography
      const sizeCategory = Math.floor(seed * 3);
      let baseSize;
      if (sizeCategory === 0) {
        baseSize = 45 + Math.sin(seed * 100) * 8; // Small territories
      } else if (sizeCategory === 1) {
        baseSize = 55 + Math.cos(seed * 80) * 10; // Medium territories
      } else {
        baseSize = 70 + Math.sin(seed * 60) * 12; // Large territories
      }
      
      const sizeVariation = 8 + (Math.sin(seed * 50) * 6);
      const size = baseSize + sizeVariation;
      
      // Create more organic, geographic-looking placement
      const rowOffset = row % 2 === 1 ? spacingX / 2.2 : 0;
      const randomOffsetX = (Math.sin(seed * 123) * 12) + (Math.cos(seed * 234) * 8);
      const randomOffsetY = (Math.cos(seed * 456) * 10) + (Math.sin(seed * 567) * 6);
      
      const x = offsetX + col * spacingX + rowOffset + randomOffsetX;
      const y = offsetY + row * spacingY + randomOffsetY;
      
      const path = generateContinentPath(x, y, size, seed);
      
      territories.push({
        id,
        name: territoryNames[index] || `Territorio ${index + 1}`,
        x,
        y,
        path,
        neighbors: [],
        owner: null,
        troops: 0,
        size
      });
    }
  }
  
  // Calculate neighbors (adjacent territories in grid)
  territories.forEach((territory, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const neighbors: string[] = [];
    
    // Check adjacent cells (up to 6 neighbors in hexagonal pattern)
    const adjacentOffsets = [
      [-1, 0], [-1, 1],  // top
      [0, -1], [0, 1],   // sides
      [1, 0], [1, 1]     // bottom
    ];
    
    adjacentOffsets.forEach(([dRow, dCol]) => {
      const newRow = row + dRow;
      const newCol = col + dCol;
      
      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
        const neighborIndex = newRow * cols + newCol;
        neighbors.push(`t${neighborIndex}`);
      }
    });
    
    territory.neighbors = neighbors;
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
