import { Territory } from "./territoryGenerator";
import { useEffect, useState } from "react";
import troopsIcon from "@/assets/risiko-troops.png";
import mapBackground from "@/assets/risiko-background.png";
import { Home, TreePine, Church, Castle } from "lucide-react";

interface RisikoMapProps {
  territories: Territory[];
  selectedTerritory: string | null;
  boostedTerritories: string[];
  onTerritoryClick: (id: string) => void;
  disabled: boolean;
  movingTroops?: {
    fromId: string;
    toId: string;
    count: number;
  } | null;
  arrivedTroops?: {
    territoryId: string;
    timestamp: number;
  } | null;
}

export const RisikoMap = ({
  territories,
  selectedTerritory,
  boostedTerritories,
  onTerritoryClick,
  disabled,
  movingTroops,
  arrivedTroops
}: RisikoMapProps) => {
  const [animatingTroops, setAnimatingTroops] = useState<{
    x: number;
    y: number;
    count: number;
  } | null>(null);

  useEffect(() => {
    if (movingTroops) {
      const fromTerritory = territories.find(t => t.id === movingTroops.fromId);
      const toTerritory = territories.find(t => t.id === movingTroops.toId);
      
      if (fromTerritory && toTerritory) {
        setAnimatingTroops({
          x: fromTerritory.x,
          y: fromTerritory.y,
          count: movingTroops.count
        });

        // Animate to destination
        const duration = 1000;
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          const currentX = fromTerritory.x + (toTerritory.x - fromTerritory.x) * progress;
          const currentY = fromTerritory.y + (toTerritory.y - fromTerritory.y) * progress;
          
          setAnimatingTroops({
            x: currentX,
            y: currentY,
            count: movingTroops.count
          });
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setAnimatingTroops(null);
          }
        };
        
        requestAnimationFrame(animate);
      }
    }
  }, [movingTroops, territories]);

  const getColor = (territory: Territory) => {
    if (!territory.owner) return '#8B8B7A'; // Grigio acceso per neutrali
    return territory.owner === 'blue' ? '#3b82f6' : '#ef4444';
  };

  const getStrokeColor = (territory: Territory) => {
    if (selectedTerritory === territory.id) return '#fbbf24';
    if (boostedTerritories.includes(territory.id)) return '#10b981';
    return '#1f2937';
  };

  const getTroopColor = (owner: 'blue' | 'red' | null) => {
    if (!owner) return '#6b7280';
    return owner === 'blue' ? '#3b82f6' : '#ef4444';
  };

  // Generate decorations for each territory
  const getDecorations = (territory: Territory) => {
    const decorations: { icon: string; x: number; y: number; rotation: number }[] = [];
    const seed = parseInt(territory.id.replace('t', ''));
    const numDecorations = 2 + (seed % 3); // 2-4 decorations per territory
    
    const icons = ['home', 'tree', 'church', 'castle'];
    
    for (let i = 0; i < numDecorations; i++) {
      const angle = ((seed + i) / numDecorations) * Math.PI * 2;
      const distance = territory.size * (0.3 + ((seed + i * 7) % 30) / 100);
      const x = territory.x + Math.cos(angle) * distance;
      const y = territory.y + Math.sin(angle) * distance;
      const rotation = (seed + i * 13) % 360;
      
      decorations.push({
        icon: icons[(seed + i) % icons.length],
        x,
        y,
        rotation
      });
    }
    
    return decorations;
  };

  return (
    <div className="w-full h-full bg-background rounded-lg border-2 border-border overflow-hidden">
      <svg
        viewBox="0 0 1200 800"
        className="w-full h-full"
      >
        <defs>
          {/* Pattern per texture alberelli */}
          <pattern id="treePattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="8" r="2" fill="#2d5016" opacity="0.3"/>
            <circle cx="15" cy="12" r="1.5" fill="#2d5016" opacity="0.3"/>
            <circle cx="10" cy="15" r="2" fill="#2d5016" opacity="0.3"/>
          </pattern>
          
          {/* Pattern per striature */}
          <pattern id="stripePattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="10" y2="10" stroke="#000" strokeWidth="0.5" opacity="0.1"/>
          </pattern>
        </defs>

        {/* Background image */}
        <image
          href={mapBackground}
          x="0"
          y="0"
          width="1200"
          height="800"
          preserveAspectRatio="xMidYMid slice"
          opacity="0.9"
        />
        
        {/* Render connection lines first (behind territories) */}
        {territories.map((territory) => 
          territory.neighbors.map((neighborId) => {
            const neighbor = territories.find(t => t.id === neighborId);
            if (!neighbor || territory.id > neighborId) return null; // Draw each line once
            
            return (
              <line
                key={`${territory.id}-${neighborId}`}
                x1={territory.x}
                y1={territory.y}
                x2={neighbor.x}
                y2={neighbor.y}
                stroke="#4a5a3a"
                strokeWidth={2}
                strokeDasharray="5,5"
                opacity={0.5}
              />
            );
          })
        )}

        {/* Render territories */}
        {territories.map((territory) => (
          <g key={territory.id}>
            {/* Territory path with solid color */}
            <path
              d={territory.path}
              fill={getColor(territory)}
              stroke={getStrokeColor(territory)}
              strokeWidth={selectedTerritory === territory.id ? 4 : 2.5}
              className={`transition-all ${!disabled ? 'cursor-pointer hover:brightness-110' : 'cursor-not-allowed'}`}
              onClick={() => !disabled && onTerritoryClick(territory.id)}
            />
            
            {/* Texture overlay */}
            <path
              d={territory.path}
              fill="url(#treePattern)"
              pointerEvents="none"
            />
            <path
              d={territory.path}
              fill="url(#stripePattern)"
              pointerEvents="none"
            />
            
            {/* Territory decorations (houses, trees, etc) */}
            {getDecorations(territory).map((decoration, idx) => (
              <g key={idx} transform={`translate(${decoration.x}, ${decoration.y}) rotate(${decoration.rotation})`}>
                {decoration.icon === 'home' && (
                  <Home className="w-3 h-3" style={{ color: '#654321', opacity: 0.6 }} />
                )}
                {decoration.icon === 'tree' && (
                  <TreePine className="w-3 h-3" style={{ color: '#2d5016', opacity: 0.6 }} />
                )}
                {decoration.icon === 'church' && (
                  <Church className="w-3 h-3" style={{ color: '#8B4513', opacity: 0.6 }} />
                )}
                {decoration.icon === 'castle' && (
                  <Castle className="w-3 h-3" style={{ color: '#696969', opacity: 0.6 }} />
                )}
              </g>
            ))}
            
            {/* Territory name - centered and scaled to fit */}
            <text
              x={territory.x}
              y={territory.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[9px] font-bold fill-white pointer-events-none"
              style={{ 
                textShadow: '1px 1px 3px rgba(0,0,0,0.9)',
                fontSize: `${Math.max(7, territory.size / 6)}px`
              }}
            >
              {territory.name}
            </text>
            
            {/* Troops icon and count */}
            {territory.troops > 0 && (
              <g className={arrivedTroops?.territoryId === territory.id ? 'animate-scale-in' : ''}>
                <image
                  href={troopsIcon}
                  x={territory.x - 16}
                  y={territory.y + 12}
                  width={32}
                  height={32}
                  style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.5))` }}
                  opacity={0.9}
                />
                <circle
                  cx={territory.x}
                  cy={territory.y + 48}
                  r={11}
                  fill={getTroopColor(territory.owner)}
                  stroke="#fff"
                  strokeWidth={2}
                />
                <text
                  x={territory.x}
                  y={territory.y + 48}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-xs font-bold fill-white pointer-events-none"
                >
                  {territory.troops}
                </text>
              </g>
            )}

            {/* Boost indicator */}
            {boostedTerritories.includes(territory.id) && (
              <g>
                <circle
                  cx={territory.x + 25}
                  cy={territory.y - 25}
                  r={12}
                  fill="#10b981"
                  className="animate-pulse"
                />
                <text
                  x={territory.x + 25}
                  y={territory.y - 25}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-sm font-bold fill-white pointer-events-none"
                >
                  ⚡
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Animated moving troops */}
        {animatingTroops && (
          <g className="animate-pulse">
            <image
              href={troopsIcon}
              x={animatingTroops.x - 20}
              y={animatingTroops.y - 25}
              width={40}
              height={40}
              style={{ filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.7))` }}
              opacity={0.8}
            />
            <circle
              cx={animatingTroops.x}
              cy={animatingTroops.y + 22}
              r={14}
              fill="#fbbf24"
              stroke="#fff"
              strokeWidth={2}
            />
            <text
              x={animatingTroops.x}
              y={animatingTroops.y + 22}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-sm font-bold fill-white pointer-events-none"
            >
              {animatingTroops.count}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
