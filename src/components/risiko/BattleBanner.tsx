import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Swords, Zap, Skull, Trophy, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  userPlayer: 'blue' | 'red'; // Aggiunto per sapere chi è l'utente
  attackerPlayer: 'blue' | 'red'; // Aggiunto per sapere chi attacca
}

export const BattleBanner = ({
  show,
  attackerProfile,
  defenderProfile,
  attackerTroops,
  defenderTroops,
  winner,
  survivingTroops,
  onComplete,
  userPlayer,
  attackerPlayer
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

      // Complete (3.5s after result shown)
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 6000);

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
    const isUserAttacker = userPlayer === attackerPlayer;
    
    if (winner === 'draw') return 'PAREGGIO!';
    
    if (winner === 'attacker') {
      // L'attaccante ha vinto
      if (isUserAttacker) {
        return 'HAI VINTO!';
      } else {
        return 'SEI STATO SCONFITTO!';
      }
    } else {
      // Il difensore ha vinto
      if (isUserAttacker) {
        return 'SEI STATO RESPINTO!';
      } else {
        return 'HAI DIFESO IL TERRITORIO!';
      }
    }
  };

  const getResultIcon = () => {
    const isUserAttacker = userPlayer === attackerPlayer;
    const userWon = (winner === 'attacker' && isUserAttacker) || (winner === 'defender' && !isUserAttacker);
    
    if (winner === 'draw') return <Skull className="w-16 h-16 text-gray-400" />;
    if (userWon) return <Trophy className="w-16 h-16 text-yellow-400" />;
    return <Skull className="w-16 h-16 text-red-400" />;
  };

  const getResultSubtext = () => {
    const isUserAttacker = userPlayer === attackerPlayer;
    
    if (winner === 'draw') {
      return '💀 Entrambi eliminati 💀';
    }
    
    if (winner === 'attacker') {
      if (isUserAttacker) {
        return '🎉 Territorio conquistato! 🎉';
      } else {
        return '💔 Il tuo territorio è stato conquistato 💔';
      }
    } else {
      if (isUserAttacker) {
        return '😞 Attacco fallito 😞';
      } else {
        return '🛡️ Difesa riuscita! 🛡️';
      }
    }
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
                <div className="flex items-center gap-4 bg-red-500/30 backdrop-blur px-10 py-5 rounded-full border-2 border-red-500">
                  <Swords className="w-16 h-16 text-red-400" />
                  <span className="text-white font-bold text-5xl">{attackerTroops}</span>
                </div>
              </div>
            </div>

            {/* VS Symbol */}
            <div className="flex flex-col items-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20 hover:text-white gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Spiegazione
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Come si gioca a Risiko</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      <section>
                        <h3 className="text-xl font-bold mb-3 text-primary">🎯 Obiettivo del Gioco</h3>
                        <p className="text-muted-foreground">
                          L'obiettivo è conquistare tutti i territori sulla mappa sconfiggendo gli avversari. 
                          Vince chi riesce a controllare l'intera mappa eliminando tutti i giocatori nemici.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold mb-3 text-primary">🎮 Come si Gioca</h3>
                        <div className="space-y-2 text-muted-foreground">
                          <p><strong>1. Fase di Rinforzo:</strong> All'inizio di ogni turno ricevi truppe bonus in base ai territori che controlli e ai continenti completi.</p>
                          <p><strong>2. Fase di Attacco:</strong> Puoi attaccare territori nemici adiacenti. Il combattimento si risolve con dei dadi virtuali.</p>
                          <p><strong>3. Fase di Movimento:</strong> Alla fine del turno puoi spostare truppe tra i tuoi territori adiacenti per fortificare le tue difese.</p>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold mb-3 text-primary">⚔️ Combattimento</h3>
                        <div className="space-y-2 text-muted-foreground">
                          <p>Quando attacchi un territorio nemico:</p>
                          <ul className="list-disc pl-6 space-y-1">
                            <li>L'attaccante può usare fino a 3 truppe per attaccare</li>
                            <li>Il difensore può usare fino a 2 truppe per difendersi</li>
                            <li>Si lanciano i dadi e si confrontano i risultati</li>
                            <li>La truppa con il dado più basso perde un'unità</li>
                            <li>Se conquisti il territorio, devi spostare almeno le truppe che hai usato per attaccare</li>
                          </ul>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold mb-3 text-primary">🃏 Le Carte Speciali</h3>
                        <div className="space-y-3 text-muted-foreground">
                          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="font-bold text-red-400">💣 Carta Bomba</p>
                            <p className="text-sm">Elimina immediatamente tutte le truppe nemiche da un territorio, conquistandolo istantaneamente. Devastante per punti strategici!</p>
                          </div>
                          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="font-bold text-blue-400">🪂 Carta Paracadute</p>
                            <p className="text-sm">Permette di spostare truppe verso qualsiasi tuo territorio sulla mappa, anche non adiacente. Perfetta per rinforzi d'emergenza!</p>
                          </div>
                          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="font-bold text-yellow-400">⚡ Carta Forza</p>
                            <p className="text-sm">Raddoppia le truppe in un territorio scelto. Usa questa carta per creare una fortezza inespugnabile!</p>
                          </div>
                          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="font-bold text-green-400">🎖️ Carta Truppe</p>
                            <p className="text-sm">Aggiunge +5 truppe bonus da piazzare dove vuoi. Ottima per espansioni rapide o difese critiche!</p>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold mb-3 text-primary">🌍 Bonus Continenti</h3>
                        <p className="text-muted-foreground mb-2">
                          Controllare un intero continente ti dà truppe bonus extra ogni turno:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                          <li>Più territori ha un continente, maggiore è il bonus</li>
                          <li>Difendi i tuoi continenti completi per massimizzare i rinforzi</li>
                          <li>Conquista i continenti nemici per indebolirli</li>
                        </ul>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold mb-3 text-primary">💡 Consigli Strategici</h3>
                        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                          <li>Concentra le tue truppe piuttosto che sparpagliarle</li>
                          <li>Controlla i territori di confine tra continenti (punti strategici)</li>
                          <li>Usa le carte al momento giusto per ribaltare le sorti della battaglia</li>
                          <li>Non attaccare troppo: lascia sempre truppe sufficienti per difenderti</li>
                          <li>Conquista territori adiacenti per creare linee difensive solide</li>
                        </ul>
                      </section>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

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
                <div className="flex items-center gap-4 bg-blue-500/30 backdrop-blur px-10 py-5 rounded-full border-2 border-blue-500">
                  <Swords className="w-16 h-16 text-blue-400" />
                  <span className="text-white font-bold text-5xl">{defenderTroops}</span>
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
            <div className={`font-bold text-2xl animate-bounce ${
              (winner === 'attacker' && userPlayer === attackerPlayer) || (winner === 'defender' && userPlayer !== attackerPlayer)
                ? 'text-green-400'
                : winner === 'draw'
                ? 'text-gray-400'
                : 'text-red-400'
            }`}>
              {getResultSubtext()}
            </div>
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
