export interface Territory {
  id: string;
  x: number;
  y: number;
  path: string;
  neighbors: string[];
  owner: 'blue' | 'red' | null;
  troops: number;
  size: number;
}

// Generate irregular continent-like path
const generateContinentPath = (centerX: number, centerY: number, size: number, seed: number): string => {
  const points: [number, number][] = [];
  const numPoints = 6 + Math.floor(seed * 6);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const variance = 0.5 + (Math.sin(seed * 100 + i * 7) * 0.5);
    const distance = size * variance;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    points.push([x, y]);
  }
  
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

export const generateTerritories = (): Territory[] => {
  const territories: Territory[] = [];
  
  // Grid layout: 6 rows x 7 columns = 42 territories
  const rows = 6;
  const cols = 7;
  const spacingX = 160;
  const spacingY = 120;
  const offsetX = 80;
  const offsetY = 60;
  
  // Generate 42 territories with varied sizes and positions
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const id = `t${index}`;
      const seed = index / 42;
      
      // Vary continent sizes
      const baseSize = 35;
      const sizeVariation = 15 + (Math.sin(seed * 50) * 10);
      const size = baseSize + sizeVariation;
      
      // Stagger odd rows and add some randomness
      const rowOffset = row % 2 === 1 ? spacingX / 2 : 0;
      const randomOffsetX = (Math.sin(seed * 123) * 15);
      const randomOffsetY = (Math.cos(seed * 456) * 12);
      
      const x = offsetX + col * spacingX + rowOffset + randomOffsetX;
      const y = offsetY + row * spacingY + randomOffsetY;
      
      const path = generateContinentPath(x, y, size, seed);
      
      territories.push({
        id,
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
