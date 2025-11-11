export interface Territory {
  id: string;
  x: number;
  y: number;
  path: string;
  neighbors: string[];
  owner: 'blue' | 'red' | null;
  troops: number;
}

// Generate irregular SVG paths for territories
const generateIrregularPath = (centerX: number, centerY: number, size: number, seed: number): string => {
  const points: [number, number][] = [];
  const numPoints = 8 + Math.floor(seed * 4);
  
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;
    const variance = 0.6 + (Math.sin(seed * 100 + i) * 0.4);
    const distance = size * variance;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance;
    points.push([x, y]);
  }
  
  // Create smooth curve path
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
  const rows = 6;
  const cols = 7;
  const baseSize = 50;
  const spacingX = 170;
  const spacingY = 130;
  const offsetX = 100;
  const offsetY = 50;
  
  // Generate 42 territories in grid with irregular shapes
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const id = `t${row * cols + col}`;
      const seed = (row * cols + col) / 42;
      const size = baseSize + (Math.sin(seed * 20) * 15);
      
      // Stagger odd rows
      const x = offsetX + col * spacingX + (row % 2 === 1 ? spacingX / 2 : 0);
      const y = offsetY + row * spacingY;
      
      const path = generateIrregularPath(x, y, size, seed);
      
      territories.push({
        id,
        x,
        y,
        path,
        neighbors: [],
        owner: null,
        troops: 0
      });
    }
  }
  
  // Calculate neighbors (adjacent territories)
  territories.forEach((territory, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const neighbors: string[] = [];
    
    // Check adjacent cells
    const adjacentOffsets = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    adjacentOffsets.forEach(([dRow, dCol]) => {
      const newRow = row + dRow;
      const newCol = col + dCol;
      if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols) {
        neighbors.push(`t${newRow * cols + newCol}`);
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
