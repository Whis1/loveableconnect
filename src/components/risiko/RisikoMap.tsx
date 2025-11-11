import { Territory } from "./territoryGenerator";
import { useEffect, useState } from "react";
import troopsIcon from "@/assets/risiko-troops.png";
import mapBackground from "@/assets/risiko-zombie-background.png";

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

  const roadNamePairs: [string, string][] = [
    ['Baia Nebbiosa', 'Bosco Incantato'],
    ['Mare Interno', 'Terre Ghiacciate'],
    ['Mare Interno', 'Savana Dorata'],
    ['Mare Interno', 'Bosco Incantato'],
    ['Fiume Lungo', 'Mare Interno'],
  ];

  return (
    <div className="w-full h-full bg-background rounded-lg border-2 border-border overflow-hidden">
      <svg
        viewBox="0 0 1600 950"
        className="w-full h-full"
      >
        <defs>
          {/* Pattern animato per il movimento delle truppe */}
          <linearGradient id="movingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0"/>
            <stop offset="50%" stopColor="#fbbf24" stopOpacity="1"/>
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/>
            <animate attributeName="x1" values="-100%;100%" dur="1s" repeatCount="indefinite"/>
            <animate attributeName="x2" values="0%;200%" dur="1s" repeatCount="indefinite"/>
          </linearGradient>
        </defs>

        {/* Background image */}
        <image
          href={mapBackground}
          x="0"
          y="0"
          width="1600"
          height="950"
          preserveAspectRatio="xMidYMid slice"
          opacity="0.95"
        />
        
        {/* Stradine speciali: visive e percorribili */}
        
        {/* Render connection lines first (behind territories) */}
        {territories.map((territory) => 
          territory.neighbors.map((neighborId) => {
            const neighbor = territories.find(t => t.id === neighborId);
            if (!neighbor || territory.id > neighborId) return null;
            
            // Calcola distanza per identificare collegamenti con stradine
            const dx = territory.x - neighbor.x;
            const dy = territory.y - neighbor.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Strada speciale? Non nasconderla
            const isSpecialRoad = roadNamePairs.some(([a,b]) =>
              (territory.name === a && neighbor.name === b) ||
              (territory.name === b && neighbor.name === a)
            );
            
            // Mostra stradine speciali anche se la distanza è bassa
            if (distance < 350 && !isSpecialRoad) return null;
            
            const isLongDistance = distance > 450; // Collegamenti intercontinentali
            
            // Check if this line is being used for troop movement
            const isMovingPath = movingTroops && 
              ((movingTroops.fromId === territory.id && movingTroops.toId === neighborId) ||
                (movingTroops.fromId === neighborId && movingTroops.toId === territory.id));
            
            return (
              <g key={`${territory.id}-${neighborId}`}>
                {/* Base line - stile diverso per collegamenti distanti */}
                <line
                  x1={territory.x}
                  y1={territory.y}
                  x2={neighbor.x}
                  y2={neighbor.y}
                  stroke="#8B7355"
                  strokeWidth={isLongDistance ? 2 : 3}
                  strokeDasharray={isLongDistance ? "6,6" : "8,4"}
                  opacity={isLongDistance ? 0.5 : 0.7}
                />
                {/* Animated overlay when troops are moving */}
                {isMovingPath && (
                  <>
                    <line
                      x1={territory.x}
                      y1={territory.y}
                      x2={neighbor.x}
                      y2={neighbor.y}
                      stroke="#fbbf24"
                      strokeWidth={5}
                      strokeDasharray="8,4"
                      opacity={0.8}
                      className="animate-pulse"
                    />
                    <line
                      x1={territory.x}
                      y1={territory.y}
                      x2={neighbor.x}
                      y2={neighbor.y}
                      stroke="url(#movingGradient)"
                      strokeWidth={6}
                      strokeLinecap="round"
                    />
                  </>
                )}
              </g>
            );
          })
        )}

        {/* Render territories */}
        {territories.map((territory) => (
          <g key={territory.id}>
            {/* Define clip path for this territory */}
            <defs>
              <clipPath id={`clip-${territory.id}`}>
                <path d={territory.path} />
              </clipPath>
            </defs>
            
            {/* Territory path with solid color */}
            <path
              d={territory.path}
              fill={getColor(territory)}
              stroke={getStrokeColor(territory)}
              strokeWidth={selectedTerritory === territory.id ? 4 : 2.5}
              className={`transition-all ${!disabled ? 'cursor-pointer hover:brightness-110' : 'cursor-not-allowed'}`}
              onClick={() => !disabled && onTerritoryClick(territory.id)}
            />
            
            {/* Linee geografiche interne */}
            <path
              d={territory.path}
              fill="none"
              stroke="#000"
              strokeWidth="0.5"
              opacity="0.15"
              strokeDasharray="2,2"
              pointerEvents="none"
            />

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

        {/* Render all territory names and badges first */}
        {territories.map((territory) => {
          const territoryIndex = parseInt(territory.id.substring(1));
          // Badge più variati basati sull'indice del territorio
          const badgeTypes = [
            { icon: '🏔️', color: '#6b7280' },
            { icon: '🌲', color: '#22c55e' },
            { icon: '🏜️', color: '#f59e0b' },
            { icon: '🏭', color: '#ef4444' },
            { icon: '🏛️', color: '#8b5cf6' },
            { icon: '🌊', color: '#3b82f6' },
            { icon: '⚡', color: '#eab308' },
            { icon: '🛡️', color: '#64748b' },
            { icon: '🌋', color: '#dc2626' },
            { icon: '❄️', color: '#06b6d4' },
            { icon: '🏰', color: '#7c3aed' },
            { icon: '⛰️', color: '#475569' },
            { icon: '🌴', color: '#059669' },
            { icon: '🏕️', color: '#92400e' },
            { icon: '🗿', color: '#78716c' },
            { icon: '💎', color: '#0ea5e9' },
            { icon: '🔥', color: '#f97316' },
            { icon: '🌿', color: '#16a34a' },
            { icon: '⚔️', color: '#991b1b' },
            { icon: '🏞️', color: '#84cc16' },
          ];
          const badge = badgeTypes[territoryIndex % badgeTypes.length];
          
          return (
            <g key={`name-${territory.id}`} pointerEvents="none">
              {/* Territory name - centered and scaled to fit - nascosto per territori coperti */}
              {/* Nascondi nomi per territori che stanno sotto altri (circa 1 su 2) */}
              {territoryIndex % 2 === 0 && (
                <>
                  <text
                    x={territory.x}
                    y={territory.y - territory.size * 0.15}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[7px] font-semibold pointer-events-none"
                    style={{ 
                      fill: '#000',
                      textShadow: '2px 2px 4px rgba(255,255,255,0.9)',
                      fontSize: `${Math.max(6, territory.size / 8)}px`
                    }}
                  >
                    {territory.name}
                  </text>
                  
                  {/* Badge sotto il nome - solo icona, più in basso */}
                  <g transform={`translate(${territory.x}, ${territory.y + territory.size * 0.05})`} pointerEvents="none">
                    <circle
                      cx="0"
                      cy="0"
                      r="12"
                      fill={badge.color}
                      opacity="0.9"
                      stroke="#fff"
                      strokeWidth="2"
                    />
                    <text
                      x="0"
                      y="1"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[14px] pointer-events-none"
                      style={{ 
                        fontSize: '14px'
                      }}
                    >
                      {badge.icon}
                    </text>
                  </g>
                </>
              )}
            </g>
          );
        })}

        {/* Render all troops LAST so they're always on top of EVERYTHING */}
        {territories.map((territory) => (
          <g key={`troops-${territory.id}`} pointerEvents="none">
            {/* Troops icon and count - icon bigger and above number */}
            {territory.troops > 0 && (
              <g className={arrivedTroops?.territoryId === territory.id ? 'animate-scale-in' : ''} pointerEvents="none">
                {/* Icon positioned above the number circle */}
                <image
                  href={troopsIcon}
                  x={territory.x - 24}
                  y={territory.y - territory.size * 0.45}
                  width={48}
                  height={48}
                  style={{ filter: `drop-shadow(0 3px 6px rgba(0,0,0,0.7))` }}
                  opacity={0.95}
                />
                {/* Number circle below the icon */}
                <circle
                  cx={territory.x}
                  cy={territory.y + territory.size * 0.1}
                  r={13}
                  fill={getTroopColor(territory.owner)}
                  stroke="#fff"
                  strokeWidth={2.5}
                />
                <text
                  x={territory.x}
                  y={territory.y + territory.size * 0.1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-sm font-bold fill-white pointer-events-none"
                >
                  {territory.troops}
                </text>
              </g>
            )}
          </g>
        ))}

        {/* Animated moving troops - bigger icon */}
        {animatingTroops && (
          <g className="animate-pulse">
            <image
              href={troopsIcon}
              x={animatingTroops.x - 30}
              y={animatingTroops.y - 50}
              width={60}
              height={60}
              style={{ filter: `drop-shadow(0 5px 10px rgba(0,0,0,0.8))` }}
              opacity={0.9}
            />
            <circle
              cx={animatingTroops.x}
              cy={animatingTroops.y + 35}
              r={16}
              fill="#fbbf24"
              stroke="#fff"
              strokeWidth={3}
            />
            <text
              x={animatingTroops.x}
              y={animatingTroops.y + 35}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-base font-bold fill-white pointer-events-none"
            >
              {animatingTroops.count}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};
