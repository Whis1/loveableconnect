import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plane, Users, Zap, BookOpen } from "lucide-react";
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

  // Preload/unlock audio on first user interaction and set volumes
  useEffect(() => {
    // Set base volumes
    marchSound.volume = 0.6;
    bombSound.volume = 0.8;
    parachuteSound.volume = 0.6;
    powerUpSound.volume = 0.6;

    const unlock = () => {
      const audios = [marchSound, bombSound, parachuteSound, powerUpSound];
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
  }, [marchSound, bombSound, parachuteSound, powerUpSound]);

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
          setMovingTroops
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
          console.log('[Risiko] Tentativo movimento:', {
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
        setTimeout(() => switchTurn(), 1500);
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
                blue: {...prev.cardCooldowns.blue, bomb: 5}
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
                blue: {...prev.cardCooldowns.blue, parachute: 3}
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
                  blue: {...prev.cardCooldowns.blue, parachute: 3}
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
                  blue: {...prev.cardCooldowns.blue, parachute: 3}
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
              blue: {...prev.cardCooldowns.blue, force: 3}
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

      // Vittoria: +20 ELO Risiko
      await supabase
        .from('profiles')
        .update({ game_elo: (userProfile.game_elo || 1200) + 20 })
        .eq('id', userProfile.id);
    } else {
      // Sconfitta: -10 ELO Risiko
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

  // AI sends random emoji occasionally
  useEffect(() => {
    if (gameState.currentPlayer === 'red' && !gameState.gameOver) {
      const shouldSendEmoji = Math.random() < 0.15;
      if (shouldSendEmoji) {
        const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        setTimeout(() => {
          setOpponentEmoji(randomEmoji);
          setTimeout(() => setOpponentEmoji(null), 3000);
        }, 1000 + Math.random() * 2000);
      }
    }
  }, [gameState.currentPlayer, gameState.turnTimeLeft]);

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
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
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
              gameState.currentPlayer === 'blue' && !gameState.gameOver && !cardActionInProgress
                ? `cursor-pointer hover:scale-105 ${gameState.selectedCard === 'troops' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => gameState.currentPlayer === 'blue' && !gameState.gameOver && !cardActionInProgress && setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'troops' ? null : 'troops' }))}
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
              gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.bomb === 0 && !cardActionInProgress
                ? `cursor-pointer hover:scale-105 ${gameState.selectedCard === 'bomb' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.bomb === 0 && !cardActionInProgress && setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'bomb' ? null : 'bomb' }))}
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
              gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.parachute === 0 && !cardActionInProgress
                ? `cursor-pointer hover:scale-105 ${gameState.selectedCard === 'parachute' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.parachute === 0 && !cardActionInProgress && setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'parachute' ? null : 'parachute' }))}
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
              gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.force === 0 && !cardActionInProgress
                ? `cursor-pointer hover:scale-105 ${gameState.selectedCard === 'force' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => gameState.currentPlayer === 'blue' && !gameState.gameOver && gameState.cardCooldowns.blue.force === 0 && !cardActionInProgress && setGameState(prev => ({ ...prev, selectedCard: prev.selectedCard === 'force' ? null : 'force' }))}
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
