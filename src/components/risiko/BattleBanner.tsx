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
                    <DialogTitle className="text-2xl font-bold">Come si gioca a Conquistiator</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      <section>
                        <h3 className="text-2xl font-bold mb-4 text-primary">Benvenuto nel Conquistiator di LoveableConnect!</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          In questo gioco metterai alla prova la tua astuzia strategica contro altri utenti, per conquistare territori, guadagnare crediti e dimostrare chi domina.
                        </p>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold mb-3 text-primary">🎯 Regole Base</h3>
                        <div className="space-y-2 text-muted-foreground">
                          <p>A ogni inizio partita ti verranno assegnati <strong>5 territori</strong>, in ogni territorio <strong>2 truppe</strong>, per un totale di 10 truppe. Puoi attaccare, difenderti, conquistare o rafforzare le tue truppe. Scegli attentamente la tua strategia.</p>
                          <p className="font-semibold mt-4">Vince chi conquista tutti i territori dell'avversario, eliminando tutte le sue truppe dalla mappa.</p>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold mb-3 text-primary">🏆 Premi e Classifiche</h3>
                        <ul className="space-y-2 text-muted-foreground">
                          <li>🎉 Ogni <strong>vittoria</strong> ti fa guadagnare <strong>6 crediti</strong> e <strong>+20 ELO</strong></li>
                          <li>🤝 Un <strong>pareggio</strong> non assegna punti né crediti</li>
                          <li>😔 Una <strong>sconfitta</strong> ti farà perdere <strong>-10 punti ELO</strong></li>
                        </ul>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold mb-3 text-primary">🃏 Le Carte - La Chiave della Vittoria</h3>
                        <p className="text-muted-foreground mb-4">
                          Nel Conquistiator di LoveableConnect, le carte sono la chiave per vincere o ribaltare qualsiasi battaglia. Ci sono 4 carte totali, e ognuna può cambiare il destino della partita.
                        </p>
                        
                        <div className="space-y-4">
                          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="font-bold text-green-400 text-lg mb-2">🎴 1. Aggiungi Truppe</p>
                            <div className="text-sm text-muted-foreground space-y-2">
                              <p>Questa carta ti permette di rinforzare il tuo esercito aggiungendo nuove truppe.</p>
                              <p>Hai la possibilità di inviare <strong>+1 truppa per turno</strong> su un tuo territorio conquistato, ma più territori conquisti, più rinforzi riceverai:</p>
                              <ul className="list-disc pl-6 space-y-1 mt-2">
                                <li>Se controlli <strong>10 territori</strong>, la carta aumenta di <strong>+2 truppe</strong></li>
                                <li>Se ne hai <strong>20</strong>, diventa <strong>+4 truppe</strong></li>
                                <li>Se domini <strong>28 territori</strong>, diventa <strong>+6 truppe</strong> a ogni utilizzo</li>
                              </ul>
                              <p className="mt-2 italic">Puoi usare questa carta ogni turno, e rappresenta il tuo potere politico e territoriale crescente.</p>
                            </div>
                          </div>

                          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="font-bold text-red-400 text-lg mb-2">💣 2. Bombardamento Aereo</p>
                            <div className="text-sm text-muted-foreground space-y-2">
                              <p>Un'arma devastante. Può essere usata <strong>una volta ogni 6 turni</strong>.</p>
                              <p>Elimina <strong>2 truppe nemiche</strong> in un colpo solo. Pianifica con attenzione la tua strategia. Un bombardamento ben piazzato può cambiare il corso di una guerra… o farti vincere una partita.</p>
                            </div>
                          </div>

                          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="font-bold text-blue-400 text-lg mb-2">🪂 3. Paracadutista</p>
                            <div className="text-sm text-muted-foreground space-y-2">
                              <p>La carta più audace e imprevedibile, può essere usata <strong>una volta ogni 5 turni</strong>.</p>
                              <p>Ti consente di conquistare territori vicini o distanti, e far atterrare una truppa in un territorio nemico.</p>
                              <ul className="list-disc pl-6 space-y-1 mt-2">
                                <li>Se il nemico ha <strong>una sola truppa</strong>, il tuo paracadutista la elimina e <strong>conquista il territorio</strong></li>
                                <li>Ma se ci sono <strong>più truppe</strong>, il tuo soldato cadrà in battaglia senza conquistare nulla</li>
                              </ul>
                              <p className="mt-2 italic">È una mossa rischiosa, ma letale se usata al momento giusto.</p>
                              <p className="mt-3 text-yellow-400 font-semibold">💡 Suggerimento facoltativo: lascia sempre 2 o più truppe nel territorio, per evitare che un paracadutista nemico ti conquisti facilmente il territorio.</p>
                            </div>
                          </div>

                          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="font-bold text-yellow-400 text-lg mb-2">⚔️ 4. Potenziamento Truppe</p>
                            <div className="text-sm text-muted-foreground space-y-2">
                              <p>La carta perfetta per gli scontri diretti. Può essere usata <strong>una volta ogni 4 turni</strong>.</p>
                              <p>Quando una tua truppa ha il potenziamento attivo:</p>
                              <ul className="list-disc pl-6 space-y-1 mt-2">
                                <li>In un <strong>1 vs 1</strong>, vince automaticamente</li>
                                <li>In un <strong>1 vs 2</strong>, riesce a pareggiare, ma perde il potere dopo il primo scontro</li>
                              </ul>
                              <p className="mt-2 italic">Usala con intelligenza: una truppa potenziata nel punto giusto può ribaltare un'intera partita.</p>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-xl font-bold mb-3 text-primary">💡 Conclusione</h3>
                        <div className="text-muted-foreground space-y-2">
                          <p className="font-semibold">Usa le carte con strategia.</p>
                          <p>Ogni decisione può portarti alla vittoria o farti perdere tutto. Sfrutta i momenti giusti, osserva l'avversario e conquista la mappa.</p>
                          <p className="text-lg font-bold text-primary mt-4">Alla fine, solo uno sarà il vero dominatore.</p>
                        </div>
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
