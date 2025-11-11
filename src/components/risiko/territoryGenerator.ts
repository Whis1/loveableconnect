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

// Generate irregular continent-like path with realistic shapes
const generateContinentPath = (centerX: number, centerY: number, size: number, seed: number): string => {
  const points: [number, number][] = [];
  // More points for more complex, realistic shapes
  const numPoints = 8 + Math.floor(seed * 8);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    // Much more variation in distance to create irregular continent shapes
    const variance = 0.4 + (Math.sin(seed * 100 + i * 7) * 0.4) + (Math.cos(seed * 50 + i * 3) * 0.3);
    const distance = size * variance;
    
    // Add some jaggedness for realistic coastlines
    const jitterX = Math.sin(seed * 200 + i * 11) * size * 0.15;
    const jitterY = Math.cos(seed * 200 + i * 13) * size * 0.15;
    
    const x = centerX + Math.cos(angle) * distance + jitterX;
    const y = centerY + Math.sin(angle) * distance + jitterY;
    points.push([x, y]);
  }
  
  // Create smoother curves for more realistic continent shapes
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const nextNext = points[(i + 2) % points.length];
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
  const spacingX = 125; // Closer together
  const spacingY = 100; // Closer together vertically
  const offsetX = 80; // More margin on left
  const offsetY = 80; // More margin on top to prevent overflow
  
  // Generate 42 territories with varied sizes and positions
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const id = `t${index}`;
      const seed = index / 42;
      
      // Much larger continent sizes for realistic appearance
      const baseSize = 60;
      const sizeVariation = 18 + (Math.sin(seed * 50) * 12);
      const size = baseSize + sizeVariation;
      
      // Stagger odd rows and add some randomness for more organic placement
      const rowOffset = row % 2 === 1 ? spacingX / 2 : 0;
      const randomOffsetX = (Math.sin(seed * 123) * 10);
      const randomOffsetY = (Math.cos(seed * 456) * 8);
      
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
