export interface Territory {
  id: string;
  x: number;
  y: number;
  path: string;
  neighbors: string[];
  owner: 'blue' | 'red' | null;
  troops: number;
}

// Realistic continent-like shapes for each territory
const continentShapes = [
  // North America - Alaska style (large, irregular)
  "M 50,80 Q 60,60 80,70 Q 95,65 110,75 Q 115,90 105,110 Q 90,120 70,115 Q 55,105 50,80 Z",
  // Western Canada
  "M 120,85 Q 140,75 160,80 Q 175,85 180,100 Q 175,115 160,120 Q 140,118 125,105 Q 118,95 120,85 Z",
  // Eastern Canada
  "M 185,90 Q 200,85 215,92 Q 225,100 220,115 Q 210,125 195,122 Q 185,110 185,90 Z",
  // Greenland
  "M 230,70 Q 245,65 260,72 Q 268,85 262,100 Q 248,108 235,102 Q 228,88 230,70 Z",
  
  // Central America
  "M 145,160 Q 155,155 165,158 Q 170,168 165,178 Q 155,182 145,177 Q 142,168 145,160 Z",
  
  // South America - Venezuela
  "M 180,185 Q 195,180 210,185 Q 215,195 210,205 Q 195,210 185,205 Q 178,195 180,185 Z",
  // Brazil (large)
  "M 220,210 Q 240,205 260,215 Q 275,230 270,250 Q 260,265 240,268 Q 220,260 215,245 Q 218,225 220,210 Z",
  // Peru
  "M 185,215 Q 200,210 210,218 Q 212,230 205,240 Q 195,243 188,235 Q 184,225 185,215 Z",
  // Argentina
  "M 200,270 Q 215,265 225,272 Q 228,290 220,310 Q 210,318 200,312 Q 195,295 200,270 Z",
  // Chile (long, thin)
  "M 185,275 Q 192,270 198,278 Q 200,295 195,315 Q 188,320 185,310 Q 182,290 185,275 Z",
  
  // Europe - Iceland
  "M 280,75 Q 290,72 298,78 Q 300,88 295,95 Q 287,98 282,92 Q 278,83 280,75 Z",
  // Scandinavia
  "M 305,65 Q 320,60 335,68 Q 342,80 338,95 Q 325,102 312,98 Q 303,85 305,65 Z",
  // Great Britain
  "M 285,105 Q 295,100 305,106 Q 308,118 302,128 Q 292,132 286,125 Q 283,115 285,105 Z",
  // Western Europe
  "M 310,115 Q 325,110 340,118 Q 345,130 338,142 Q 325,148 315,142 Q 308,130 310,115 Z",
  // Southern Europe
  "M 345,145 Q 360,140 375,148 Q 380,160 372,172 Q 358,178 348,170 Q 343,158 345,145 Z",
  // Eastern Europe
  "M 345,105 Q 365,100 385,108 Q 395,120 388,135 Q 370,142 355,135 Q 343,122 345,105 Z",
  
  // Africa - North
  "M 320,180 Q 345,175 370,182 Q 385,195 378,215 Q 355,225 335,218 Q 318,205 320,180 Z",
  // Central Africa
  "M 340,230 Q 360,225 380,233 Q 390,248 382,265 Q 362,273 345,265 Q 338,250 340,230 Z",
  // South Africa
  "M 345,275 Q 360,270 375,278 Q 380,295 370,310 Q 355,315 345,308 Q 340,292 345,275 Z",
  // Madagascar
  "M 395,295 Q 402,290 410,296 Q 412,308 406,318 Q 398,322 393,315 Q 390,305 395,295 Z",
  
  // Middle East
  "M 390,175 Q 410,170 430,178 Q 438,192 430,205 Q 412,212 398,205 Q 388,192 390,175 Z",
  // Egypt
  "M 380,185 Q 392,180 405,186 Q 410,198 402,210 Q 390,215 383,207 Q 378,196 380,185 Z",
  
  // Asia - Russia West
  "M 400,90 Q 425,85 450,93 Q 465,105 458,125 Q 435,135 415,128 Q 398,115 400,90 Z",
  // Russia Central
  "M 465,80 Q 490,75 515,83 Q 530,95 523,115 Q 500,125 480,118 Q 463,105 465,80 Z",
  // Russia East
  "M 535,85 Q 560,80 585,88 Q 598,100 590,120 Q 568,130 548,123 Q 533,110 535,85 Z",
  // Siberia
  "M 520,60 Q 545,55 570,63 Q 583,75 575,92 Q 552,100 532,93 Q 518,80 520,60 Z",
  
  // Central Asia
  "M 440,135 Q 460,130 480,138 Q 488,152 480,165 Q 462,172 447,165 Q 438,152 440,135 Z",
  // Kazakhstan
  "M 450,115 Q 470,110 490,118 Q 498,132 490,145 Q 472,152 457,145 Q 448,132 450,115 Z",
  
  // Middle East continued
  "M 420,185 Q 438,180 456,188 Q 462,202 454,215 Q 438,222 426,215 Q 418,202 420,185 Z",
  
  // India
  "M 485,180 Q 505,175 525,183 Q 535,200 525,220 Q 505,230 490,222 Q 483,205 485,180 Z",
  // Southeast Asia
  "M 540,215 Q 555,210 570,218 Q 575,232 567,245 Q 553,250 543,242 Q 538,228 540,215 Z",
  
  // China
  "M 545,135 Q 570,130 595,138 Q 608,155 598,175 Q 573,185 553,178 Q 543,162 545,135 Z",
  // Mongolia
  "M 550,110 Q 570,105 590,113 Q 598,127 590,140 Q 572,148 557,140 Q 548,127 550,110 Z",
  // Japan (island chain)
  "M 620,140 Q 630,135 640,142 Q 643,155 636,165 Q 627,170 620,163 Q 617,152 620,140 Z",
  
  // Southeast Asia islands
  "M 575,250 Q 590,245 605,253 Q 610,267 602,280 Q 588,285 578,277 Q 573,265 575,250 Z",
  
  // Indonesia (large archipelago)
  "M 555,265 Q 575,260 595,268 Q 605,285 595,302 Q 575,310 560,302 Q 553,288 555,265 Z",
  
  // Philippines
  "M 610,225 Q 620,220 630,227 Q 633,240 626,250 Q 617,255 611,248 Q 608,237 610,225 Z",
  
  // Australia - North
  "M 600,320 Q 625,315 650,323 Q 668,340 660,360 Q 635,370 615,362 Q 598,348 600,320 Z",
  // Australia - South
  "M 615,365 Q 640,360 665,368 Q 678,385 668,405 Q 643,415 623,407 Q 613,390 615,365 Z",
  
  // New Zealand
  "M 690,390 Q 700,385 710,392 Q 713,405 706,415 Q 697,420 691,413 Q 688,402 690,390 Z",
  
  // Pacific Islands
  "M 730,280 Q 740,275 750,282 Q 753,295 746,305 Q 737,310 731,303 Q 728,292 730,280 Z",
  
  // Additional territories for 42 total
  "M 270,250 Q 285,245 300,253 Q 305,267 297,280 Q 285,285 273,277 Q 268,265 270,250 Z",
];

export const generateTerritories = (): Territory[] => {
  const territories: Territory[] = [];
  
  // Scale factor to spread the map across the canvas
  const scaleX = 1.5;
  const scaleY = 1.8;
  
  // Generate 42 territories with realistic continent shapes
  continentShapes.forEach((pathData, index) => {
    const id = `t${index}`;
    
    // Parse the path to get center coordinates
    const coords = pathData.match(/M\s*([\d.]+),([\d.]+)/);
    let centerX = coords ? parseFloat(coords[1]) * scaleX : 100;
    let centerY = coords ? parseFloat(coords[2]) * scaleY : 100;
    
    // Scale the entire path
    const scaledPath = pathData.replace(/(\d+\.?\d*)/g, (match) => {
      const num = parseFloat(match);
      // Alternate scaling for x and y coordinates
      return (num * (pathData.indexOf(match) % 2 === 0 ? scaleX : scaleY)).toString();
    });
    
    territories.push({
      id,
      x: centerX,
      y: centerY,
      path: scaledPath,
      neighbors: [],
      owner: null,
      troops: 0
    });
  });
  
  // Calculate neighbors based on distance (territories close to each other are neighbors)
  territories.forEach((territory, index) => {
    const neighbors: string[] = [];
    const maxDistance = 100; // Max distance to be considered a neighbor
    
    territories.forEach((other, otherIndex) => {
      if (index !== otherIndex) {
        const dx = territory.x - other.x;
        const dy = territory.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < maxDistance) {
          neighbors.push(other.id);
        }
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
