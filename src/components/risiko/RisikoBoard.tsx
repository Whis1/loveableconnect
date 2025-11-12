import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plane, Users, Zap, BookOpen, Volume2 } from "lucide-react";
import { RisikoMap } from "./RisikoMap";
import { RisikoVictoryDialog } from "./RisikoVictoryDialog";
import { TroopMoveDialog } from "./TroopMoveDialog";
import { BattleBanner } from "./BattleBanner";
import { BombingAnimation } from "./BombingAnimation";
import { generateTerritories, Territory } from "./territoryGenerator";
import { simulateBattle, canMoveTroops } from "./risikoLogic";
import { aiMakeMove } from "./risikoAI";
import troopCardImage from "@/assets/risiko-troop-card.png";
import bombCardImage from "@/assets/risiko-bomb-card.png";
import parachuteCardImage from "@/assets/risiko-parachute-card.png";
import forceCardImage from "@/assets/risiko-force-card.png";
import marciaSoldatiSound from "@/assets/audio/marcia-soldati.m4a";
import bombardamentoSound from "@/assets/audio/bombardamento.m4a";
import paracaduteSound from "@/assets/audio/paracadute.m4a";
import powerSound from "@/assets/audio/power.m4a";

type Player = 'blue' | 'red';
type CardType = 'troops' | 'bomb' | 'parachute' | 'force';

interface GameState {
  territories: Territory[];
  currentPlayer: Player;
  turnTimeLeft: number;
  selectedTerritory: string | null;
  selectedCard: CardType | null;
  cardCooldowns: {
    blue: {
      bomb: number;
      parachute: number;
      force: number;
    };
    red: {
      bomb: number;
      parachute: number;
      force: number;
    };
  };
  boostedTroops: Record<string, number>; // territoryId -> numero di truppe potenziate
  gameOver: boolean;
  winner: Player | null;
}

interface RisikoBoardProps {
  onGameEnd: (won: boolean) => void;
  userProfile: any;
  opponentProfile: any;
}

export const RisikoBoard = ({ onGameEnd, userProfile, opponentProfile }: RisikoBoardProps) => {
  const [gameState, setGameState] = useState<GameState>({
    territories: [],
    currentPlayer: Math.random() > 0.5 ? 'blue' : 'red',
    turnTimeLeft: 30,
    selectedTerritory: null,
    selectedCard: null,
    cardCooldowns: {
      blue: { bomb: 0, parachute: 0, force: 0 },
      red: { bomb: 0, parachute: 0, force: 0 }
    },
    boostedTroops: {},
    gameOver: false,
    winner: null
  });

  const [combatInProgress, setCombatInProgress] = useState(false);
  const [cardActionInProgress, setCardActionInProgress] = useState(false);

  const [showVictory, setShowVictory] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [targetTerritory, setTargetTerritory] = useState<string | null>(null);
  const [combatAnimation, setCombatAnimation] = useState<{show: boolean, message: string}>({show: false, message: ''});
  const [battleBanner, setBattleBanner] = useState<{
    show: boolean;
    attackerProfile: any;
    defenderProfile: any;
    attackerTroops: number;
    defenderTroops: number;
    winner: 'attacker' | 'defender' | 'draw';
    survivingTroops: number;
    userPlayer: 'blue' | 'red';
    attackerPlayer: 'blue' | 'red';
    onComplete: () => void;
  } | null>(null);
  const [bombingAnimation, setBombingAnimation] = useState<{
    show: boolean;
    position: { x: number; y: number };
  }>({ show: false, position: { x: 0, y: 0 } });
  const [movingTroops, setMovingTroops] = useState<{
    fromId: string;
    toId: string;
    count: number;
  } | null>(null);
  const [arrivedTroops, setArrivedTroops] = useState<{
    territoryId: string;
    timestamp: number;
  } | null>(null);
  const [lastMoveBy, setLastMoveBy] = useState<'player' | 'ai' | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [userEmoji, setUserEmoji] = useState<string | null>(null);
  const [opponentEmoji, setOpponentEmoji] = useState<string | null>(null);
  
  // ELO penalty system refs
  const gameCompletedRef = useRef(false);

  // Audio players
  const [marchSound] = useState(() => new Audio(marciaSoldatiSound));
  const [bombSound] = useState(() => new Audio(bombardamentoSound));
  const [parachuteSound] = useState(() => new Audio(paracaduteSound));
  const [powerUpSound] = useState(() => new Audio(powerSound));
  const [tutorialSound] = useState(() => new Audio("/audio/tutorial_spiegazione.m4a"));
  const [isTutorialPlaying, setIsTutorialPlaying] = useState(false);

  // Preload/unlock audio on first user interaction and set volumes
  useEffect(() => {
    // Set base volumes
    marchSound.volume = 0.85;
    bombSound.volume = 0.8;
    parachuteSound.volume = 0.6;
    powerUpSound.volume = 0.6;
    tutorialSound.volume = 0.7;

    const unlock = () => {
      const audios = [marchSound, bombSound, parachuteSound, powerUpSound, tutorialSound];
      audios.forEach((a) => {
        a.muted = true;
        a.play().then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        }).catch(() => {});
      });
      window.removeEventListener('pointerdown', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [marchSound, bombSound, parachuteSound, powerUpSound, tutorialSound]);

  // Handle tutorial audio end
  useEffect(() => {
    const handleEnded = () => setIsTutorialPlaying(false);
    tutorialSound.addEventListener('ended', handleEnded);
    return () => tutorialSound.removeEventListener('ended', handleEnded);
  }, [tutorialSound]);

  const handleTutorialAudio = () => {
    if (isTutorialPlaying) {
      tutorialSound.pause();
      tutorialSound.currentTime = 0;
      setIsTutorialPlaying(false);
    } else {
      tutorialSound.play().catch(() => {});
      setIsTutorialPlaying(true);
    }
  };

  // AI-only arrival bounce when movement completes + ensure sound
  useEffect(() => {
    if (movingTroops && lastMoveBy === 'ai') {
      try {
        if (marchSound.paused) {
          marchSound.currentTime = 0;
          marchSound.play().catch(() => {});
        }
      } catch {}
      const arrivalTimer = setTimeout(() => {
        setArrivedTroops({ territoryId: movingTroops.toId, timestamp: Date.now() });
        setTimeout(() => setArrivedTroops(null), 600);
      }, 1000);
      return () => clearTimeout(arrivalTimer);
    }
  }, [movingTroops, lastMoveBy, marchSound]);

  // Initialize game
  useEffect(() => {
    const territories = generateTerritories();
    setGameState(prev => ({ ...prev, territories }));
    
    // Check and apply pending penalty from previous abandoned game
    const applyPendingPenalty = async () => {
      if (localStorage.getItem("risiko_pending_penalty") === "1") {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.rpc('update_game_elo', {
              user_id: session.user.id,
              elo_change: -10
            });
          }
        } catch (e) {
          console.error("Failed to apply pending penalty:", e);
        } finally {
          localStorage.removeItem("risiko_pending_penalty");
        }
      }
    };
    applyPendingPenalty();
    
    // 🚨 SISTEMA PENALITÀ ELO - Protezione abbandono partita
    const handleBeforeUnload = () => {
      if (!gameCompletedRef.current) {
        // Mark penalty as pending for next session
        localStorage.setItem("risiko_pending_penalty", "1");
        
        // Attempt immediate penalty via edge function (may or may not complete)
        try {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              supabase.rpc('update_game_elo', {
                user_id: session.user.id,
                elo_change: -10
              });
            }
          });
        } catch (e) {
          console.error("Penalty attempt failed:", e);
        }
      }
    };

    const handlePopState = () => {
      if (!gameCompletedRef.current) {
        // Mark penalty as pending for next page
        localStorage.setItem("risiko_pending_penalty", "1");
        
        // Attempt immediate penalty
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (session) {
            try {
              await supabase.rpc('update_game_elo', {
                user_id: session.user.id,
                elo_change: -10
              });
            } catch (e) {
              console.error("Penalty attempt failed:", e);
            }
          }
        });
      }
    };

    // Block back navigation
    history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      
      // Penalty if abandoned without completion
      if (!gameCompletedRef.current) {
        localStorage.setItem("risiko_pending_penalty", "1");
        
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (session) {
            try {
              await supabase.rpc('update_game_elo', {
                user_id: session.user.id,
                elo_change: -10
              });
            } catch (e) {
              console.error("Penalty attempt failed:", e);
            }
          }
        });
      }
    };
  }, []);

  // Turn timer
  useEffect(() => {
    if (gameState.gameOver) return;

    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.turnTimeLeft <= 1) {
          // Switch turn
          const nextPlayer = prev.currentPlayer === 'blue' ? 'red' : 'blue';
          return {
            ...prev,
            currentPlayer: nextPlayer,
            turnTimeLeft: 30,
            selectedTerritory: null,
            selectedCard: null,
            cardCooldowns: {
              blue: {
                bomb: Math.max(0, prev.cardCooldowns.blue.bomb - 1),
                parachute: Math.max(0, prev.cardCooldowns.blue.parachute - 1),
                force: Math.max(0, prev.cardCooldowns.blue.force - 1)
              },
              red: {
                bomb: Math.max(0, prev.cardCooldowns.red.bomb - 1),
                parachute: Math.max(0, prev.cardCooldowns.red.parachute - 1),
                force: Math.max(0, prev.cardCooldowns.red.force - 1)
              }
            }
          };
        }
        return { ...prev, turnTimeLeft: prev.turnTimeLeft - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.gameOver]);

  // AI turn
  useEffect(() => {
    if (gameState.currentPlayer === 'red' && !gameState.gameOver && gameState.territories.length > 0 && !combatInProgress) {
      // Random delay between 6-14 seconds to make AI feel more realistic
      const aiThinkingTime = 6000 + Math.random() * 8000; // 6000ms to 14000ms
      const timer = setTimeout(() => {
        aiMakeMove(
          gameState, 
          setGameState, 
          handleCombat, 
          showCombatAnimation, 
          opponentProfile?.nickname || 'Avversario',
          {
            bombSound,
            parachuteSound,
            powerUpSound,
            marchSound
          },
          (message, type) => {
            if (type === 'success') toast.success(message);
            else if (type === 'info') toast.info(message);
            else if (type === 'error') toast.error(message);
          },
          setBombingAnimation,
          (state) => { setLastMoveBy(state ? 'ai' : null); setMovingTroops(state); }
        );
      }, aiThinkingTime);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameState.gameOver, gameState.territories.length, combatInProgress]);

  // Check victory
  useEffect(() => {
    // Don't check until game has started with troops
    const totalTerritories = gameState.territories.filter(t => t.owner).length;
    if (totalTerritories < 10) return; // Wait for initialization
    
    const blueTroops = gameState.territories.filter(t => t.owner === 'blue').reduce((sum, t) => sum + t.troops, 0);
    const redTroops = gameState.territories.filter(t => t.owner === 'red').reduce((sum, t) => sum + t.troops, 0);

    if (blueTroops === 0 || redTroops === 0) {
      const winner = blueTroops > 0 ? 'blue' : 'red';
      setGameState(prev => ({ ...prev, gameOver: true, winner }));
      setShowVictory(true);
      
      // Segna partita completata - nessuna penalità
      gameCompletedRef.current = true;
      
      handleGameEnd(winner === 'blue');
    }
  }, [gameState.territories]);

  const showCombatAnimation = (message: string) => {
    setCombatAnimation({show: true, message});
    setTimeout(() => setCombatAnimation({show: false, message: ''}), 3000);
  };

  const handleCombat = (attackerId: string, defenderId: string, attackerTroops: number) => {
    // Blocca altre azioni durante il combattimento
    setCombatInProgress(true);
    
    // Trova territories prima del setGameState
    const attacker = gameState.territories.find(t => t.id === attackerId);
    const defender = gameState.territories.find(t => t.id === defenderId);

    if (!attacker || !defender) {
      setCombatInProgress(false);
      return;
    }

    // Calcola quante truppe potenziate partecipano al combattimento
    const attackerBoostedCount = gameState.boostedTroops[attackerId] || 0;
    const defenderBoostedCount = gameState.boostedTroops[defenderId] || 0;
    
    // Verifica se le truppe in combattimento sono potenziate
    const attackingBoostedTroops = Math.min(attackerTroops, attackerBoostedCount);
    const isAttackerBoosted = attackingBoostedTroops > 0;
    const isDefenderBoosted = defenderBoostedCount > 0;

    const result = simulateBattle(
      attackerTroops,
      defender.troops,
      isAttackerBoosted,
      isDefenderBoosted
    );

    // Mostra banner battaglia con animazione e audio
    const attackerProfileData = attacker.owner === 'blue' ? userProfile : opponentProfile;
    const defenderProfileData = defender.owner === 'blue' ? userProfile : opponentProfile;

    setBattleBanner({
      show: true,
      attackerProfile: attackerProfileData || {
        id: attacker.owner,
        nickname: attacker.owner === 'blue' ? 'Giocatore' : 'Avversario',
        avatar_url: null
      },
      defenderProfile: defenderProfileData || {
        id: defender.owner || 'neutral',
        nickname: defender.owner === 'blue' ? 'Giocatore' : (defender.owner === 'red' ? 'Avversario' : 'Neutrale'),
        avatar_url: null
      },
      attackerTroops,
      defenderTroops: defender.troops,
      winner: result.winner,
      survivingTroops: result.survivingTroops,
      userPlayer: 'blue',
      attackerPlayer: attacker.owner as 'blue' | 'red',
      onComplete: () => {
        setBattleBanner(null);
      }
    });
    
    setGameState(prev => {
      const newTerritories = [...prev.territories];
      const attacker = newTerritories.find(t => t.id === attackerId);
      const defender = newTerritories.find(t => t.id === defenderId);

      if (!attacker || !defender) {
        return prev;
      }

      // Update territories
      attacker.troops -= attackerTroops;
      
      // Aggiorna truppe potenziate nell'attaccante
      const newBoostedTroops = { ...prev.boostedTroops };
      if (attackerBoostedCount > 0) {
        const remainingBoosted = Math.max(0, attackerBoostedCount - attackingBoostedTroops);
        if (remainingBoosted > 0) {
          newBoostedTroops[attackerId] = remainingBoosted;
        } else {
          delete newBoostedTroops[attackerId];
        }
      }
      
      if (result.winner === 'attacker') {
        defender.owner = attacker.owner;
        defender.troops = result.survivingTroops;
        // Le truppe potenziate che sopravvivono vanno al difensore conquistato
        if (attackingBoostedTroops > 0 && result.survivingTroops > 0) {
          newBoostedTroops[defenderId] = Math.min(attackingBoostedTroops, result.survivingTroops);
        } else {
          delete newBoostedTroops[defenderId];
        }
      } else if (result.winner === 'defender') {
        defender.troops = result.survivingTroops;
        // Il difensore perde truppe potenziate se ne aveva
        if (defenderBoostedCount > 0) {
          const lostTroops = (defender.troops + attackerTroops) - result.survivingTroops;
          const remainingBoosted = Math.max(0, defenderBoostedCount - lostTroops);
          if (remainingBoosted > 0) {
            newBoostedTroops[defenderId] = remainingBoosted;
          } else {
            delete newBoostedTroops[defenderId];
          }
        }
      } else {
        // Pareggio - nessun sopravvissuto
        defender.owner = null;
        defender.troops = 0;
        delete newBoostedTroops[defenderId];
      }

      return {
        ...prev,
        territories: newTerritories,
        boostedTroops: newBoostedTroops,
        selectedTerritory: null,
        selectedCard: null
      };
    });

    // Wait for battle banner (~5s) + conquest banner (2.5s se c'è) before switching turn
    const totalWaitTime = result.winner === 'attacker' ? 7500 : 5000;
    setTimeout(() => {
      setCombatInProgress(false);
      switchTurn();
    }, totalWaitTime);
  };

  const switchTurn = () => {
    setCombatInProgress(false);
    setCardActionInProgress(false);
    setGameState(prev => ({
      ...prev,
      currentPlayer: prev.currentPlayer === 'blue' ? 'red' : 'blue',
      turnTimeLeft: 30,
      selectedTerritory: null,
      selectedCard: null,
      cardCooldowns: {
        blue: {
          bomb: Math.max(0, prev.cardCooldowns.blue.bomb - 1),
          parachute: Math.max(0, prev.cardCooldowns.blue.parachute - 1),
          force: Math.max(0, prev.cardCooldowns.blue.force - 1)
        },
        red: {
          bomb: Math.max(0, prev.cardCooldowns.red.bomb - 1),
          parachute: Math.max(0, prev.cardCooldowns.red.parachute - 1),
          force: Math.max(0, prev.cardCooldowns.red.force - 1)
        }
      }
    }));
  };

  const handleTerritoryClick = (territoryId: string) => {
    if (gameState.currentPlayer !== 'blue' || gameState.gameOver || combatInProgress || cardActionInProgress) return;

    const territory = gameState.territories.find(t => t.id === territoryId);
    if (!territory) return;

    // Card usage
    if (gameState.selectedCard) {
      handleCardUsage(territoryId);
      return;
    }

    // Territory selection for movement
    if (!gameState.selectedTerritory) {
      if (territory.owner === 'blue' && territory.troops > 0) {
        setGameState(prev => ({ ...prev, selectedTerritory: territoryId }));
      }
    } else {
      if (territoryId === gameState.selectedTerritory) {
        setGameState(prev => ({ ...prev, selectedTerritory: null }));
      } else {
        const source = gameState.territories.find(t => t.id === gameState.selectedTerritory);
        if (source) {
          const neighborNames = source.neighbors.map(id => gameState.territories.find(t => t.id === id)?.name || id);
          console.log('[Conquistiator] Tentativo movimento:', {
            from: { id: source.id, name: source.name, troops: source.troops },
            to: { id: territory.id, name: territory.name, troops: territory.troops, owner: territory.owner },
            sourceNeighbors: neighborNames,
          });
        }
        if (source && canMoveTroops(source, territory, gameState.territories)) {
          setTargetTerritory(territoryId);
          setMoveDialogOpen(true);
        } else {
          const reason = source?.troops === 0
            ? 'nessuna truppa da muovere'
            : 'territorio non adiacente o senza stradina';
          toast.error(`Non puoi muovere truppe qui: ${reason}`);
        }
      }
    }
  };

  const handleMoveTroops = (amount: number) => {
    if (!gameState.selectedTerritory || !targetTerritory) return;

    // 🚨 BLOCCA TUTTE LE INTERAZIONI durante spostamento truppe
    setCardActionInProgress(true);
    setLastMoveBy('player');

    // Play march sound
    marchSound.currentTime = 0;
    marchSound.play().catch(console.error);

    // Start animation
    setMovingTroops({
      fromId: gameState.selectedTerritory,
      toId: targetTerritory,
      count: amount
    });

    // Wait for animation then update
    setTimeout(() => {
      setMovingTroops(null);

      // Check if this is a combat move
      const source = gameState.territories.find(t => t.id === gameState.selectedTerritory);
      const target = gameState.territories.find(t => t.id === targetTerritory);
      const isCombat = target && target.owner && target.owner !== source?.owner && target.troops > 0;

      setGameState(prev => {
        const newTerritories = [...prev.territories];
        const source = newTerritories.find(t => t.id === prev.selectedTerritory);
        const target = newTerritories.find(t => t.id === targetTerritory);

        if (!source || !target) return prev;

        // Combat case - don't remove troops here, handleCombat will do it
        if (target.owner && target.owner !== source.owner && target.troops > 0) {
          setTimeout(() => handleCombat(source.id, target.id, amount), 100);
          return prev;
        }
        
        // Gestione truppe potenziate durante il movimento
        const newBoostedTroops = { ...prev.boostedTroops };
        const sourceBoostedCount = prev.boostedTroops[source.id] || 0;
        
        // For non-combat moves, remove troops from source
        source.troops -= amount;
        
        // Gestione del potenziamento
        if (sourceBoostedCount > 0) {
          const remainingTroops = source.troops;
          const movedBoostedTroops = Math.min(amount, sourceBoostedCount);
          const remainingBoostedTroops = sourceBoostedCount - movedBoostedTroops;
          
          // Il potenziamento segue il gruppo maggiore di truppe
          if (amount > remainingTroops) {
            // Più truppe spostate che rimanenti -> il boost va al target
            if (movedBoostedTroops > 0) {
              const targetCurrentBoosted = newBoostedTroops[target.id] || 0;
              newBoostedTroops[target.id] = targetCurrentBoosted + movedBoostedTroops;
            }
            if (remainingBoostedTroops > 0) {
              newBoostedTroops[source.id] = remainingBoostedTroops;
            } else {
              delete newBoostedTroops[source.id];
            }
          } else if (amount < remainingTroops) {
            // Meno truppe spostate che rimanenti -> il boost rimane alla sorgente
            if (remainingBoostedTroops > 0) {
              newBoostedTroops[source.id] = remainingBoostedTroops;
            } else {
              delete newBoostedTroops[source.id];
            }
          } else {
            // Stesso numero -> il boost va al target (tutte le truppe si spostano)
            if (movedBoostedTroops > 0) {
              const targetCurrentBoosted = newBoostedTroops[target.id] || 0;
              newBoostedTroops[target.id] = targetCurrentBoosted + movedBoostedTroops;
            }
            delete newBoostedTroops[source.id];
          }
        }
        
        if (target.owner === source.owner) {
          // Merge
          target.troops += amount;
          toast.success(`${amount} truppe unite`);
        } else {
          // Conquest of neutral territory (no banner for gray territories)
          target.owner = source.owner;
          target.troops = amount;
        }

        return { ...prev, territories: newTerritories, boostedTroops: newBoostedTroops };
      });

      setTargetTerritory(null);
      
      // Switch turn ONLY for non-combat moves (merges and neutral conquests)
      // For combat, handleCombat will handle the turn switch
      if (!isCombat) {
        setTimeout(() => {
          // 🔓 RIATTIVA INTERAZIONI solo DOPO switch turno
          setCardActionInProgress(false);
          switchTurn();
        }, 1000);
      } else {
        // Per combattimenti, riattiva dopo handleCombat
        // (handleCombat già gestisce il timing)
      }
    }, 1000);
  };

  const handleCardUsage = (territoryId: string) => {
    const territory = gameState.territories.find(t => t.id === territoryId);
    if (!territory) return;

    switch (gameState.selectedCard) {
      case 'troops':
        if (territory.owner === 'blue') {
          setCardActionInProgress(true);
          const blueCount = gameState.territories.filter(t => t.owner === 'blue').length;
          const getTroopCardAmount = (territoryCount: number) => {
            if (territoryCount >= 28) return 6;
            if (territoryCount >= 20) return 4;
            if (territoryCount >= 10) return 2;
            return 1;
          };
          const amount = getTroopCardAmount(blueCount);
          
          showCombatAnimation(`+${amount} truppe aggiunte!`);
          setGameState(prev => ({
            ...prev,
            territories: prev.territories.map(t => 
              t.id === territoryId ? {...t, troops: t.troops + amount} : t
            ),
            selectedCard: null
          }));
          toast.success(`+${amount} truppe aggiunte`);
          
          // Wait for animation to complete before switching turn
          setTimeout(() => switchTurn(), 2000);
        }
        break;

      case 'bomb':
        if (gameState.cardCooldowns.blue.bomb === 0 && territory.owner === 'red' && territory.troops > 0) {
          setCardActionInProgress(true);
          // Play bomb sound
          bombSound.currentTime = 0;
          bombSound.play().catch(console.error);

          // Get territory position (approximate center of screen for animation)
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;
          setBombingAnimation({
            show: true,
            position: { x: screenWidth / 2, y: screenHeight / 2 }
          });

          // Wait for animation to complete before applying effect
          setTimeout(() => {
            showCombatAnimation("💣 Bombardamento aereo!");
            setGameState(prev => ({
              ...prev,
              territories: prev.territories.map(t => {
                if (t.id === territoryId) {
                  const newTroops = Math.max(0, t.troops - 2);
                  return {...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner};
                }
                return t;
              }),
              cardCooldowns: {
                ...prev.cardCooldowns,
                blue: {...prev.cardCooldowns.blue, bomb: 6}
              },
              selectedCard: null
            }));
            // Wait for combat animation to complete (3s) before switching turn
            setTimeout(() => switchTurn(), 3000);
          }, 2300);
        }
        break;

      case 'parachute':
        if (gameState.cardCooldowns.blue.parachute === 0) {
          setCardActionInProgress(true);
          // Può atterrare su territori vuoti o nemici
          if (territory.owner === 'blue') {
            toast.error("Non puoi paracadutare sul tuo territorio!");
            setCardActionInProgress(false);
            return;
          }

          // Play parachute sound
          parachuteSound.currentTime = 0;
          parachuteSound.play().catch(console.error);

          if (!territory.owner || territory.troops === 0) {
            // Territorio vuoto/neutrale - conquista normale
            showCombatAnimation("🪂 Paracadutista lanciato!");
            setGameState(prev => ({
              ...prev,
              territories: prev.territories.map(t => 
                t.id === territoryId ? {...t, owner: 'blue', troops: 1} : t
              ),
              cardCooldowns: {
                ...prev.cardCooldowns,
                blue: {...prev.cardCooldowns.blue, parachute: 5}
              },
              selectedCard: null
            }));
            toast.success("Territorio conquistato!");
          } else if (territory.owner === 'red') {
            // Territorio nemico - logica di combattimento
            if (territory.troops === 1) {
              // 1 truppa nemica - la uccide e si posiziona
              showCombatAnimation("🪂 Paracadutista elimina il nemico!");
              setGameState(prev => ({
                ...prev,
                territories: prev.territories.map(t => 
                  t.id === territoryId ? {...t, owner: 'blue', troops: 1} : t
                ),
                cardCooldowns: {
                  ...prev.cardCooldowns,
                  blue: {...prev.cardCooldowns.blue, parachute: 5}
                },
                selectedCard: null,
                boostedTroops: {
                  ...prev.boostedTroops,
                  [territoryId]: undefined // Rimuove eventuali potenziamenti
                }
              }));
              toast.success("Paracadutista conquista il territorio!");
            } else {
              // 2+ truppe nemiche - muore ma toglie -1 truppa
              showCombatAnimation("🪂 Paracadutista abbattuto! -1 truppa nemica");
              setGameState(prev => ({
                ...prev,
                territories: prev.territories.map(t => 
                  t.id === territoryId ? {...t, troops: t.troops - 1} : t
                ),
                cardCooldowns: {
                  ...prev.cardCooldowns,
                  blue: {...prev.cardCooldowns.blue, parachute: 5}
                },
                selectedCard: null
              }));
              toast.info("Paracadutista abbattuto, ma elimina una truppa nemica!");
            }
          }
          
          // Wait for animation to complete (3s) before switching turn
          setTimeout(() => switchTurn(), 3000);
        }
        break;

      case 'force':
        if (gameState.cardCooldowns.blue.force === 0 && territory.owner === 'blue' && territory.troops > 0) {
          setCardActionInProgress(true);
          // Play power up sound
          powerUpSound.currentTime = 0;
          powerUpSound.play().catch(console.error);

          showCombatAnimation("⚡ Truppe potenziate!");
          setGameState(prev => ({
            ...prev,
            boostedTroops: {
              ...prev.boostedTroops,
              [territoryId]: territory.troops // Tutte le truppe del territorio diventano potenziate
            },
            cardCooldowns: {
              ...prev.cardCooldowns,
              blue: {...prev.cardCooldowns.blue, force: 4}
            },
            selectedCard: null
          }));
          toast.success("Truppe potenziate con successo!");
          
          // Wait for animation to complete before switching turn
          setTimeout(() => switchTurn(), 2500);
        }
        break;
    }
  };

  const handleGameEnd = async (won: boolean) => {
    // 🏆 Segna partita completata - nessuna penalità abbandono
    gameCompletedRef.current = true;
    
    if (won) {
      const { data: credits } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', userProfile.id)
        .single();

      if (credits) {
        await supabase
          .from('user_credits')
          .update({ balance: credits.balance + 6 })
          .eq('user_id', userProfile.id);
      }

      // Vittoria: +20 ELO Conquistiator
      await supabase
        .from('profiles')
        .update({ game_elo: (userProfile.game_elo || 1200) + 20 })
        .eq('id', userProfile.id);
    } else {
      // Sconfitta: -10 ELO Conquistiator
      await supabase
        .from('profiles')
        .update({ game_elo: Math.max(0, (userProfile.game_elo || 1200) - 10) })
        .eq('id', userProfile.id);
    }

    onGameEnd(won);
  };

  const blueCount = gameState.territories.filter(t => t.owner === 'blue').length;
  const getTroopCardAmount = (territoryCount: number) => {
    if (territoryCount >= 28) return 6;
    if (territoryCount >= 20) return 4;
    if (territoryCount >= 10) return 2;
    return 1;
  };
  const troopCardAmount = getTroopCardAmount(blueCount);

  // Emoji system
  const availableEmojis = ['😊', '😎', '🔥', '💪', '👍', '😂', '🎉', '⚔️', '🏆', '💀', '😤', '🤔', '😈', '😇', '💦', '🥲', '😢', '😭', '💣', '🪖'];

  const handleEmojiClick = (emoji: string) => {
    setUserEmoji(emoji);
    setShowEmoji(false);
    setTimeout(() => setUserEmoji(null), 3000);
  };

  // AI sends random emoji every 1-3 minutes
  useEffect(() => {
    if (!gameState.gameOver) {
      const sendRandomEmoji = () => {
        const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        setOpponentEmoji(randomEmoji);
        setTimeout(() => setOpponentEmoji(null), 3000);
        
        // Schedule next emoji after 1-3 minutes (60000-180000 ms)
        const nextDelay = 60000 + Math.random() * 120000;
        return setTimeout(sendRandomEmoji, nextDelay);
      };
      
      // First emoji after 1-3 minutes
      const initialDelay = 60000 + Math.random() * 120000;
      const initialTimer = setTimeout(sendRandomEmoji, initialDelay);
      
      return () => clearTimeout(initialTimer);
    }
  }, [gameState.gameOver]);

  // Build avatar URL from storage path or accept full URLs
  const getAvatarUrl = (avatarPath?: string | null) => {
    if (!avatarPath) return "";
    if (/^https?:\/\//.test(avatarPath)) return avatarPath;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/profile-images/${avatarPath}`;
  };

  const userAvatarUrl = getAvatarUrl(userProfile?.avatar_url);
  const opponentAvatarUrl = getAvatarUrl(opponentProfile?.avatar_url);

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      {/* Header with Profiles */}
      <div className="flex items-center justify-between gap-4">
        {/* User Profile (Blu) */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
          gameState.currentPlayer === 'blue' 
            ? 'border-blue-500 bg-blue-500/10 shadow-lg scale-105' 
            : 'border-border/50 bg-background/50'
        }`}>
          <div className="relative">
            <Avatar className="w-12 h-12 border-2 border-blue-500">
              <AvatarImage 
                src={userAvatarUrl}
                alt={userProfile?.nickname}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {userProfile?.nickname?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {gameState.currentPlayer === 'blue' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
            )}
            {userEmoji && (
              <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-3xl animate-bounce">
                {userEmoji}
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-blue-500">{userProfile?.nickname}</p>
            <p className="text-xs text-muted-foreground">
              {gameState.territories.filter(t => t.owner === 'blue').length} territori
            </p>
            <p className="text-xs text-muted-foreground">
              {gameState.territories.filter(t => t.owner === 'blue').reduce((sum, t) => sum + t.troops, 0)} truppe
            </p>
            <p className="text-xs text-blue-400 font-semibold">
              ELO: {userProfile?.game_elo || 1200}
            </p>
          </div>
        </div>

        {/* VS, Timer and Emoji Button */}
        <div className="flex flex-col items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 relative z-[60]"
            onClick={handleTutorialAudio}
          >
            <Volume2 className="w-4 h-4" />
            {isTutorialPlaying ? 'Ferma spiegazione' : 'Ascolta spiegazione'}
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2 relative z-[60]"
              >
                <BookOpen className="w-4 h-4" />
                Leggi spiegazione
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Benvenuto nel Conquistiator di LoveableConnect!</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-2xl font-bold mb-4 text-primary">Come si gioca a Conquistiator?</h3>
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
          
          <div className="text-3xl font-bold flex items-center gap-2">
            <span>⚔️</span>
            <span>VS</span>
            <span>⚔️</span>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            ⏱️ {gameState.turnTimeLeft}s
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmoji(!showEmoji)}
            className="mt-1"
            disabled={gameState.gameOver}
          >
            😊
          </Button>
        </div>

        {/* Opponent Profile (Rosso) */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
          gameState.currentPlayer === 'red' 
            ? 'border-red-500 bg-red-500/10 shadow-lg scale-105' 
            : 'border-border/50 bg-background/50'
        }`}>
          <div className="flex-1 text-right">
            <p className="font-bold text-red-500">{opponentProfile?.nickname}</p>
            <p className="text-xs text-muted-foreground">
              {gameState.territories.filter(t => t.owner === 'red').length} territori
            </p>
            <p className="text-xs text-muted-foreground">
              {gameState.territories.filter(t => t.owner === 'red').reduce((sum, t) => sum + t.troops, 0)} truppe
            </p>
            <p className="text-xs text-red-400 font-semibold">
              ELO: {opponentProfile?.game_elo || 1200}
            </p>
          </div>
          <div className="relative">
            <Avatar className="w-12 h-12 border-2 border-red-500">
              <AvatarImage 
                src={opponentAvatarUrl}
                alt={opponentProfile?.nickname}
                className="object-cover"
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {opponentProfile?.nickname?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {gameState.currentPlayer === 'red' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            )}
            {opponentEmoji && (
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-3xl animate-bounce">
                {opponentEmoji}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-background/95 rounded-lg border shadow-lg animate-fade-in">
          {availableEmojis.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => handleEmojiClick(emoji)}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {emoji}
            </Button>
          ))}
        </div>
      )}

      {/* Combat Animation */}
      {combatAnimation.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <Card className="p-6 bg-background/95 animate-scale-in">
            <p className="text-2xl font-bold text-center">{combatAnimation.message}</p>
          </Card>
        </div>
      )}

      {/* Main Content - Map and Cards */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* Cards on the left side - always visible */}
        <div className="flex flex-col gap-2 w-20">
          <Card 
            className={`p-2 transition-all ${
              gameState.currentPlayer === 'blue' && !gameState.gameOver && !cardActionInProgress && !movingTroops
                ? `cursor-pointer hover:scale-105 ${gameState.selectedCard === 'troops' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => gameState.currentPlayer === 'blue' && !gameState.gameOver && !cardActionInProgress && !movingTroops && setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'troops' ? null : 'troops' }))}
          >
            <div className="flex flex-col items-center gap-1 relative">
              <img 
                src={troopCardImage} 
                alt="Aggiungi Truppe" 
                className="w-full h-auto rounded"
              />
              <span className="absolute bottom-1 text-xl font-bold text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                +{troopCardAmount}
              </span>
            </div>
          </Card>
          
          <Card 
            className={`p-2 transition-all ${
              gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.bomb === 0 && !cardActionInProgress && !movingTroops
                ? `cursor-pointer hover:scale-105 ${gameState.selectedCard === 'bomb' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.bomb === 0 && !cardActionInProgress && !movingTroops && setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'bomb' ? null : 'bomb' }))}
          >
            <div className="flex flex-col items-center gap-1 relative">
              <img 
                src={bombCardImage} 
                alt="Bombardamento Aereo" 
                className="w-full h-auto rounded"
              />
              {gameState.cardCooldowns.blue.bomb > 0 && (
                <span className="absolute bottom-1 text-xl font-bold text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {gameState.cardCooldowns.blue.bomb}
                </span>
              )}
            </div>
          </Card>
          
          <Card 
            className={`p-2 transition-all ${
              gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.parachute === 0 && !cardActionInProgress && !movingTroops
                ? `cursor-pointer hover:scale-105 ${gameState.selectedCard === 'parachute' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.parachute === 0 && !cardActionInProgress && !movingTroops && setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'parachute' ? null : 'parachute' }))}
          >
            <div className="flex flex-col items-center gap-1 relative">
              <img 
                src={parachuteCardImage} 
                alt="Paracadutista" 
                className="w-full h-auto rounded"
              />
              {gameState.cardCooldowns.blue.parachute > 0 && (
                <span className="absolute bottom-1 text-xl font-bold text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {gameState.cardCooldowns.blue.parachute}
                </span>
              )}
            </div>
          </Card>
          
          <Card 
            className={`p-2 transition-all ${
              gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.force === 0 && !cardActionInProgress && !movingTroops
                ? `cursor-pointer hover:scale-105 ${gameState.selectedCard === 'force' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.force === 0 && !cardActionInProgress && !movingTroops && setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'force' ? null : 'force' }))}
          >
            <div className="flex flex-col items-center gap-1 relative">
              <img 
                src={forceCardImage} 
                alt="Truppe Potenziate" 
                className="w-full h-auto rounded"
              />
              {gameState.cardCooldowns.blue.force > 0 && (
                <span className="absolute bottom-1 text-xl font-bold text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {gameState.cardCooldowns.blue.force}
                </span>
              )}
            </div>
          </Card>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-0">
          <RisikoMap
            territories={gameState.territories}
            selectedTerritory={gameState.selectedTerritory}
            boostedTroops={gameState.boostedTroops}
            onTerritoryClick={handleTerritoryClick}
            disabled={gameState.currentPlayer !== 'blue' || gameState.gameOver}
            movingTroops={movingTroops}
            arrivedTroops={arrivedTroops}
          />
        </div>
      </div>

      {/* Move Dialog */}
      <TroopMoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        maxTroops={gameState.territories.find(t => t.id === gameState.selectedTerritory)?.troops || 0}
        onConfirm={handleMoveTroops}
      />

      {/* Victory Dialog */}
      <RisikoVictoryDialog
        open={showVictory}
        winner={gameState.winner}
        userProfile={userProfile}
        onClose={() => setShowVictory(false)}
      />

      {/* Battle Banner */}
      {battleBanner?.show && (
        <BattleBanner
          show={true}
          attackerProfile={battleBanner.attackerProfile}
          defenderProfile={battleBanner.defenderProfile}
          attackerTroops={battleBanner.attackerTroops}
          defenderTroops={battleBanner.defenderTroops}
          winner={battleBanner.winner}
          survivingTroops={battleBanner.survivingTroops}
          userPlayer={battleBanner.userPlayer}
          attackerPlayer={battleBanner.attackerPlayer}
          onComplete={battleBanner.onComplete}
        />
      )}

      {/* Bombing Animation */}
      <BombingAnimation
        show={bombingAnimation.show}
        territoryPosition={bombingAnimation.position}
        onComplete={() => setBombingAnimation({ show: false, position: { x: 0, y: 0 } })}
      />
    </div>
  );
};
