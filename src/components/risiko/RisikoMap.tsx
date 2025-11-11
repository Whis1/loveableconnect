import { Territory } from "./territoryGenerator";

interface RisikoMapProps {
  territories: Territory[];
  selectedTerritory: string | null;
  boostedTerritories: string[];
  onTerritoryClick: (id: string) => void;
  disabled: boolean;
}

export const RisikoMap = ({
  territories,
  selectedTerritory,
  boostedTerritories,
  onTerritoryClick,
  disabled
}: RisikoMapProps) => {
  const getColor = (territory: Territory) => {
    if (!territory.owner) return '#6b7280';
    return territory.owner === 'blue' ? '#3b82f6' : '#ef4444';
  };

  const getStrokeColor = (territory: Territory) => {
    if (selectedTerritory === territory.id) return '#fbbf24';
    if (boostedTerritories.includes(territory.id)) return '#10b981';
    return '#1f2937';
  };

  return (
    <div className="w-full h-full bg-background rounded-lg border-2 border-border overflow-hidden">
      <svg
        viewBox="0 0 1200 800"
        className="w-full h-full"
        style={{ background: 'linear-gradient(to bottom, #2c3e1f, #1a2614)' }}
      >
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
            {/* Territory path */}
            <path
              d={territory.path}
              fill={getColor(territory)}
              stroke={getStrokeColor(territory)}
              strokeWidth={selectedTerritory === territory.id ? 4 : 2}
              className={`transition-all ${!disabled ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}`}
              onClick={() => !disabled && onTerritoryClick(territory.id)}
              opacity={territory.troops === 0 ? 0.5 : 1}
            />
            
            {/* Troops count */}
            {territory.troops > 0 && (
              <g>
                <circle
                  cx={territory.x}
                  cy={territory.y}
                  r={20}
                  fill="rgba(0,0,0,0.7)"
                  stroke="#fff"
                  strokeWidth={2}
                />
                <text
                  x={territory.x}
                  y={territory.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-lg font-bold fill-white pointer-events-none"
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
      </svg>
    </div>
  );
};
