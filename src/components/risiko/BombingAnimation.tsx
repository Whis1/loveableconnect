import { useEffect, useState } from "react";
import { Plane } from "lucide-react";

interface BombingAnimationProps {
  show: boolean;
  territoryPosition: { x: number; y: number };
  onComplete: () => void;
}

export const BombingAnimation = ({ show, territoryPosition, onComplete }: BombingAnimationProps) => {
  const [phase, setPhase] = useState<'flying' | 'bombing' | 'exploding'>('flying');
  const [bombPosition, setBombPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (show) {
      setPhase('flying');
      
      // Phase 1: Plane flies across (1s)
      const bombingTimer = setTimeout(() => {
        setPhase('bombing');
        setBombPosition({ x: territoryPosition.x, y: territoryPosition.y - 100 });
      }, 1000);

      // Phase 2: Bomb drops (0.5s)
      const explodingTimer = setTimeout(() => {
        setPhase('exploding');
      }, 1500);

      // Phase 3: Explosion and complete (0.8s)
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 2300);

      return () => {
        clearTimeout(bombingTimer);
        clearTimeout(explodingTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [show, territoryPosition, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {/* Plane */}
      {(phase === 'flying' || phase === 'bombing') && (
        <div 
          className="absolute top-1/4 transition-all duration-1000 ease-linear"
          style={{
            left: phase === 'flying' ? '-10%' : '110%',
          }}
        >
          <Plane className="w-16 h-16 text-gray-700 rotate-90" />
        </div>
      )}

      {/* Bomb */}
      {phase === 'bombing' && (
        <div 
          className="absolute transition-all duration-500 ease-in"
          style={{
            left: `${bombPosition.x}px`,
            top: `${bombPosition.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative">
            <div className="w-6 h-8 bg-black rounded-full animate-[spin_0.3s_linear_infinite]">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-3 bg-orange-500"></div>
            </div>
          </div>
        </div>
      )}

      {/* Explosion */}
      {phase === 'exploding' && (
        <div 
          className="absolute"
          style={{
            left: `${territoryPosition.x}px`,
            top: `${territoryPosition.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Main explosion */}
          <div className="relative">
            <div className="absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 bg-orange-500 rounded-full opacity-80 animate-ping"></div>
            <div className="absolute inset-0 w-24 h-24 -translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full opacity-90 animate-pulse"></div>
            <div className="absolute inset-0 w-16 h-16 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 rounded-full animate-ping"></div>
          </div>

          {/* Particles */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-orange-500 rounded-full animate-ping"
              style={{
                left: `${Math.cos((i * 30 * Math.PI) / 180) * 40}px`,
                top: `${Math.sin((i * 30 * Math.PI) / 180) * 40}px`,
                animationDelay: `${i * 0.05}s`,
                animationDuration: '0.6s'
              }}
            />
          ))}

          {/* Text */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-4xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,1)] animate-pulse">
              💣 BOOM!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
