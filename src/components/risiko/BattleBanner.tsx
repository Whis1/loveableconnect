import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Swords, Zap, Skull, Trophy } from "lucide-react";
import scontroSound from "@/assets/audio/scontro.mp3";

interface BattleBannerProps {
  show: boolean;
  attackerProfile: any;
  defenderProfile: any;
  attackerTroops: number;
  defenderTroops: number;
  winner: 'attacker' | 'defender' | 'draw';
  survivingTroops: number;
  onComplete: () => void;
}

export const BattleBanner = ({
  show,
  attackerProfile,
  defenderProfile,
  attackerTroops,
  defenderTroops,
  winner,
  survivingTroops,
  onComplete
}: BattleBannerProps) => {
  const [phase, setPhase] = useState<'intro' | 'combat' | 'result'>('intro');
  const [audio] = useState(() => new Audio(scontroSound));

  useEffect(() => {
    if (show) {
      setPhase('intro');
      
      // Play battle sound
      audio.currentTime = 0;
      audio.play().catch(console.error);

      // Intro phase (0.5s)
      const introTimer = setTimeout(() => {
        setPhase('combat');
      }, 500);

      // Combat phase (2s)
      const combatTimer = setTimeout(() => {
        setPhase('result');
      }, 2500);

      // Complete (1s after result shown)
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 4000);

      return () => {
        clearTimeout(introTimer);
        clearTimeout(combatTimer);
        clearTimeout(completeTimer);
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [show]);

  if (!show) return null;

  const getResultMessage = () => {
    if (winner === 'draw') return 'PAREGGIO!';
    if (winner === 'attacker') return 'ATTACCANTE VINCE!';
    return 'DIFENSORE RESISTE!';
  };

  const getResultIcon = () => {
    if (winner === 'draw') return <Skull className="w-16 h-16 text-gray-400" />;
    if (winner === 'attacker') return <Trophy className="w-16 h-16 text-yellow-400" />;
    return <Trophy className="w-16 h-16 text-blue-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
      {/* Background lightning effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4">
        {/* Intro & Combat Phase */}
        {(phase === 'intro' || phase === 'combat') && (
          <div className="flex items-center justify-between gap-8">
            {/* Attacker */}
            <div className={`flex flex-col items-center gap-4 transition-all duration-500 ${
              phase === 'combat' ? 'animate-[shake_0.5s_ease-in-out_infinite]' : 'animate-slide-in-left'
            }`}>
              <Avatar className="w-32 h-32 border-4 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)]">
                <AvatarImage src={attackerProfile?.avatar_url} />
                <AvatarFallback className="text-4xl bg-red-500 text-white">
                  {attackerProfile?.nickname?.[0]?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <div className="text-white font-bold text-2xl mb-2">
                  {attackerProfile?.nickname || 'Attaccante'}
                </div>
                <div className="flex items-center gap-2 bg-red-500/30 backdrop-blur px-6 py-3 rounded-full border-2 border-red-500">
                  <Swords className="w-6 h-6 text-red-400" />
                  <span className="text-white font-bold text-xl">{attackerTroops}</span>
                </div>
              </div>
            </div>

            {/* VS Symbol */}
            <div className="flex flex-col items-center gap-4">
              {phase === 'combat' ? (
                <>
                  <Zap className="w-24 h-24 text-yellow-400 animate-pulse" />
                  <div className="text-yellow-400 font-black text-4xl animate-pulse tracking-widest">
                    BATTAGLIA!
                  </div>
                </>
              ) : (
                <div className="text-white font-black text-6xl opacity-50">VS</div>
              )}
            </div>

            {/* Defender */}
            <div className={`flex flex-col items-center gap-4 transition-all duration-500 ${
              phase === 'combat' ? 'animate-[shake_0.5s_ease-in-out_infinite]' : 'animate-slide-in-right'
            }`}>
              <Avatar className="w-32 h-32 border-4 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.8)]">
                <AvatarImage src={defenderProfile?.avatar_url} />
                <AvatarFallback className="text-4xl bg-blue-500 text-white">
                  {defenderProfile?.nickname?.[0]?.toUpperCase() || 'D'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <div className="text-white font-bold text-2xl mb-2">
                  {defenderProfile?.nickname || 'Difensore'}
                </div>
                <div className="flex items-center gap-2 bg-blue-500/30 backdrop-blur px-6 py-3 rounded-full border-2 border-blue-500">
                  <Swords className="w-6 h-6 text-blue-400" />
                  <span className="text-white font-bold text-xl">{defenderTroops}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result Phase */}
        {phase === 'result' && (
          <div className="flex flex-col items-center gap-8 animate-scale-in">
            {getResultIcon()}
            <div className="text-white font-black text-5xl text-center animate-pulse">
              {getResultMessage()}
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur px-8 py-4 rounded-full border-2 border-white/30">
              <span className="text-white font-bold text-2xl">
                Truppe superstiti: {survivingTroops}
              </span>
            </div>
            {winner === 'attacker' && (
              <div className="text-green-400 font-bold text-2xl animate-bounce">
                🎉 Territorio conquistato! 🎉
              </div>
            )}
            {winner === 'defender' && (
              <div className="text-blue-400 font-bold text-2xl animate-bounce">
                🛡️ Difesa riuscita! 🛡️
              </div>
            )}
            {winner === 'draw' && (
              <div className="text-gray-400 font-bold text-2xl">
                💀 Entrambi eliminati 💀
              </div>
            )}
          </div>
        )}
      </div>

      {/* Particle effects */}
      {phase === 'combat' && (
        <>
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
