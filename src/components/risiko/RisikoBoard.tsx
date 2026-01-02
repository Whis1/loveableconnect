import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Volume2 } from "lucide-react";
import { RisikoMap } from "./RisikoMap";
import { RisikoVictoryDialog } from "./RisikoVictoryDialog";
import { TroopMoveDialog } from "./TroopMoveDialog";
import { BattleBanner } from "./BattleBanner";
import { BombingAnimation } from "./BombingAnimation";
import { PlanningControls } from "./PlanningControls";
import { ResolutionDisplay } from "./ResolutionDisplay";
import { generateTerritories, Territory } from "./territoryGenerator";
import { simulateBattle, canMoveTroops } from "./risikoLogic";
import { aiPlanTurn } from "./simultaneousAI";
import { 
  GameState, 
  Player, 
  CardType, 
  PlayerPlan, 
  PlannedTroopAssignment,
  PlannedTroopMovement,
  TROOPS_PER_ROUND, 
  MAX_PLATOONS,
  getTotalAssignedTroops,
  getMovementCount,
  createEmptyPlan
} from "./types";
import reinforcementCardImage from "@/assets/risiko-troop-card.png";
import bombCardImage from "@/assets/risiko-bomb-card.png";
import parachuteCardImage from "@/assets/risiko-parachute-card.png";
import forceCardImage from "@/assets/risiko-force-card.png";
import marciaSoldatiSound from "@/assets/audio/marcia-soldati.m4a";
import bombardamentoSound from "@/assets/audio/bombardamento.m4a";
import paracaduteSound from "@/assets/audio/paracadute.m4a";
import powerSound from "@/assets/audio/power.m4a";

interface RisikoBoardProps {
  onGameEnd: (won: boolean) => void;
  userProfile: any;
  opponentProfile: any;
}

const createInitialGameState = (territories: Territory[]): GameState => ({
  territories,
  roundNumber: 1,
  phase: 'planning',
  troopsToAssign: { blue: TROOPS_PER_ROUND, red: TROOPS_PER_ROUND },
  playerPlans: {
    blue: createEmptyPlan(),
    red: createEmptyPlan()
  },
  readyStatus: { blue: false, red: false },
  resolutionFirstPlayer: Math.random() > 0.5 ? 'blue' : 'red',
  cardCooldowns: {
    blue: { bomb: 0, parachute: 0, force: 0 },
    red: { bomb: 0, parachute: 0, force: 0 }
  },
  boostedTroops: {},
  gameOver: false,
  winner: null,
  resolutionStep: 0,
  currentResolutionPlayer: null
});

export const RisikoBoard = ({ onGameEnd, userProfile, opponentProfile }: RisikoBoardProps) => {
  const [gameState, setGameState] = useState<GameState>(() => 
    createInitialGameState([])
  );

  const [showVictory, setShowVictory] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedSourceTerritory, setSelectedSourceTerritory] = useState<string | null>(null);
  const [targetTerritory, setTargetTerritory] = useState<string | null>(null);
  const [battleBanner, setBattleBanner] = useState<any>(null);
  const [bombingAnimation, setBombingAnimation] = useState({ show: false, position: { x: 0, y: 0 } });
  const [movingTroops, setMovingTroops] = useState<{ fromId: string; toId: string; count: number } | null>(null);
  const [currentResolutionAction, setCurrentResolutionAction] = useState("");
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

  const [showEmoji, setShowEmoji] = useState(false);
  const [userEmoji, setUserEmoji] = useState<string | null>(null);
  const [opponentEmoji, setOpponentEmoji] = useState<string | null>(null);

  const gameCompletedRef = useRef(false);

  // Audio players
  const [marchSound] = useState(() => new Audio(marciaSoldatiSound));
  const [bombSound] = useState(() => new Audio(bombardamentoSound));
  const [parachuteSound] = useState(() => new Audio(paracaduteSound));
  const [powerUpSound] = useState(() => new Audio(powerSound));
  const [tutorialSound] = useState(() => new Audio("/audio/tutorial_spiegazione.m4a"));
  const [isTutorialPlaying, setIsTutorialPlaying] = useState(false);

  // Audio setup
  useEffect(() => {
    marchSound.volume = 0.85;
    bombSound.volume = 0.8;
    parachuteSound.volume = 0.6;
    powerUpSound.volume = 0.6;
    tutorialSound.volume = 0.7;

    const unlock = () => {
      [marchSound, bombSound, parachuteSound, powerUpSound, tutorialSound].forEach(a => {
        a.muted = true;
        a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => {});
      });
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [marchSound, bombSound, parachuteSound, powerUpSound, tutorialSound]);

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

  // Initialize game
  useEffect(() => {
    const territories = generateTerritories();
    setGameState(createInitialGameState(territories));
    
    // Apply pending ELO penalty
    const applyPendingPenalty = async () => {
      if (localStorage.getItem("risiko_pending_penalty") === "1") {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.rpc('update_game_elo', { user_id: session.user.id, elo_change: -10 });
          }
        } catch (e) { console.error("Failed to apply pending penalty:", e); }
        finally { localStorage.removeItem("risiko_pending_penalty"); }
      }
    };
    applyPendingPenalty();

    // Abandonment penalty handlers
    const handleBeforeUnload = () => {
      if (!gameCompletedRef.current) {
        localStorage.setItem("risiko_pending_penalty", "1");
        try {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) supabase.rpc('update_game_elo', { user_id: session.user.id, elo_change: -10 });
          });
        } catch {}
      }
    };
    const handlePopState = () => {
      if (!gameCompletedRef.current) {
        localStorage.setItem("risiko_pending_penalty", "1");
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (session) try { await supabase.rpc('update_game_elo', { user_id: session.user.id, elo_change: -10 }); } catch {}
        });
      }
    };

    history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (!gameCompletedRef.current) {
        localStorage.setItem("risiko_pending_penalty", "1");
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (session) try { await supabase.rpc('update_game_elo', { user_id: session.user.id, elo_change: -10 }); } catch {}
        });
      }
    };
  }, []);

  // AI plans and clicks "Pronto" after 10-20 seconds
  useEffect(() => {
    if (gameState.phase === 'planning' && !gameState.readyStatus.red && !gameState.gameOver && gameState.territories.length > 0) {
      const aiThinkingTime = 10000 + Math.random() * 10000; // 10-20 seconds
      const timer = setTimeout(() => {
        const aiPlan = aiPlanTurn(gameState);
        setGameState(prev => ({
          ...prev,
          playerPlans: { ...prev.playerPlans, red: aiPlan },
          readyStatus: { ...prev.readyStatus, red: true }
        }));
        toast.info(`${opponentProfile?.nickname || 'Avversario'} è pronto!`);
      }, aiThinkingTime);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, gameState.readyStatus.red, gameState.gameOver, gameState.territories.length, opponentProfile]);

  // Start resolution when both ready
  useEffect(() => {
    if (gameState.readyStatus.blue && gameState.readyStatus.red && gameState.phase === 'planning') {
      setGameState(prev => ({
        ...prev,
        phase: 'resolving',
        currentResolutionPlayer: prev.resolutionFirstPlayer,
        resolutionStep: 0
      }));
    }
  }, [gameState.readyStatus.blue, gameState.readyStatus.red, gameState.phase]);

  // Resolution sequence
  useEffect(() => {
    if (gameState.phase !== 'resolving' || gameState.gameOver) return;

    const executeResolution = async () => {
      const firstPlayer = gameState.resolutionFirstPlayer;
      const secondPlayer = firstPlayer === 'blue' ? 'red' : 'blue';

      // Execute first player's actions
      await executePlayerActions(firstPlayer);
      
      // Then second player's actions
      await executePlayerActions(secondPlayer);

      // Start next round
      startNextRound();
    };

    const timeoutId = setTimeout(executeResolution, 1000);
    return () => clearTimeout(timeoutId);
  }, [gameState.phase]);

  const executePlayerActions = async (player: Player) => {
    const plan = gameState.playerPlans[player];
    const playerName = player === 'blue' ? userProfile?.nickname : opponentProfile?.nickname;

    setGameState(prev => ({ ...prev, currentResolutionPlayer: player }));

    // 1. Execute troop assignments (animate)
    for (const assignment of plan.troopAssignments) {
      setCurrentResolutionAction(`${playerName} assegna +${assignment.amount} truppe`);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setGameState(prev => ({
        ...prev,
        territories: prev.territories.map(t =>
          t.id === assignment.territoryId ? { ...t, troops: t.troops + assignment.amount } : t
        )
      }));
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    // 2. Execute troop movements
    for (const movement of plan.troopMovements) {
      const fromTerritory = gameState.territories.find(t => t.id === movement.fromId);
      const toTerritory = gameState.territories.find(t => t.id === movement.toId);
      
      setCurrentResolutionAction(`${playerName} sposta ${movement.amount} truppe`);
      marchSound.currentTime = 0;
      marchSound.play().catch(() => {});

      setMovingTroops({ fromId: movement.fromId, toId: movement.toId, count: movement.amount });
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMovingTroops(null);

      setGameState(prev => {
        const newTerritories = [...prev.territories];
        const source = newTerritories.find(t => t.id === movement.fromId);
        const target = newTerritories.find(t => t.id === movement.toId);

        if (source && target && source.owner === player) {
          source.troops -= movement.amount;
          
          if (target.owner === player || !target.owner || target.troops === 0) {
            // Merge or conquest of neutral
            target.troops += movement.amount;
            if (!target.owner) target.owner = player;
          }
          // Combat would be handled differently in full implementation
        }

        return { ...prev, territories: newTerritories };
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // 3. Execute card usage
    if (plan.cardUsage) {
      await executeCard(player, plan.cardUsage.cardType, plan.cardUsage.targetTerritoryId, playerName || 'Giocatore');
    }
  };

  const executeCard = async (player: Player, cardType: CardType, targetId: string, playerName: string) => {
    const territory = gameState.territories.find(t => t.id === targetId);
    if (!territory) return;

    switch (cardType) {
      case 'reinforcement':
        const count = gameState.territories.filter(t => t.owner === player).length;
        const amount = count >= 28 ? 6 : count >= 20 ? 4 : count >= 10 ? 2 : 1;
        setCurrentResolutionAction(`${playerName} usa Carta Rinforzi (+${amount})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setGameState(prev => ({
          ...prev,
          territories: prev.territories.map(t =>
            t.id === targetId ? { ...t, troops: t.troops + amount } : t
          )
        }));
        break;

      case 'bomb':
        setCurrentResolutionAction(`${playerName} usa Bombardamento Aereo!`);
        bombSound.currentTime = 0;
        bombSound.play().catch(() => {});
        
        setBombingAnimation({ show: true, position: { x: window.innerWidth / 2, y: window.innerHeight / 2 } });
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        setGameState(prev => ({
          ...prev,
          territories: prev.territories.map(t => {
            if (t.id === targetId) {
              const newTroops = Math.max(0, t.troops - 2);
              return { ...t, troops: newTroops, owner: newTroops === 0 ? null : t.owner };
            }
            return t;
          }),
          cardCooldowns: {
            ...prev.cardCooldowns,
            [player]: { ...prev.cardCooldowns[player], bomb: 6 }
          }
        }));
        break;

      case 'parachute':
        setCurrentResolutionAction(`${playerName} lancia Paracadutista!`);
        parachuteSound.currentTime = 0;
        parachuteSound.play().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 1500));

        setGameState(prev => {
          const target = prev.territories.find(t => t.id === targetId);
          if (!target) return prev;

          const newTerritories = prev.territories.map(t => {
            if (t.id !== targetId) return t;
            
            if (!t.owner || t.troops === 0) {
              return { ...t, owner: player, troops: 1 };
            } else if (t.owner !== player) {
              if (t.troops === 1) {
                return { ...t, owner: player, troops: 1 };
              } else {
                return { ...t, troops: t.troops - 1 };
              }
            }
            return t;
          });

          return {
            ...prev,
            territories: newTerritories,
            cardCooldowns: {
              ...prev.cardCooldowns,
              [player]: { ...prev.cardCooldowns[player], parachute: 5 }
            }
          };
        });
        break;

      case 'force':
        setCurrentResolutionAction(`${playerName} potenzia le truppe!`);
        powerUpSound.currentTime = 0;
        powerUpSound.play().catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 1000));

        setGameState(prev => ({
          ...prev,
          boostedTroops: {
            ...prev.boostedTroops,
            [targetId]: territory.troops
          },
          cardCooldowns: {
            ...prev.cardCooldowns,
            [player]: { ...prev.cardCooldowns[player], force: 4 }
          }
        }));
        break;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const startNextRound = () => {
    // Check victory conditions
    const blueTroops = gameState.territories.filter(t => t.owner === 'blue').reduce((sum, t) => sum + t.troops, 0);
    const redTroops = gameState.territories.filter(t => t.owner === 'red').reduce((sum, t) => sum + t.troops, 0);

    if (blueTroops === 0 || redTroops === 0) {
      const winner = blueTroops > 0 ? 'blue' : 'red';
      setGameState(prev => ({ ...prev, gameOver: true, winner }));
      setShowVictory(true);
      gameCompletedRef.current = true;
      handleGameEnd(winner === 'blue');
      return;
    }

    // Decrement cooldowns and start new round
    setGameState(prev => ({
      ...prev,
      roundNumber: prev.roundNumber + 1,
      phase: 'planning',
      troopsToAssign: { blue: TROOPS_PER_ROUND, red: TROOPS_PER_ROUND },
      playerPlans: { blue: createEmptyPlan(), red: createEmptyPlan() },
      readyStatus: { blue: false, red: false },
      resolutionFirstPlayer: prev.resolutionFirstPlayer === 'blue' ? 'red' : 'blue',
      currentResolutionPlayer: null,
      resolutionStep: 0,
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

    setSelectedCard(null);
    setCurrentResolutionAction("");
    toast.success(`Round ${gameState.roundNumber + 1} iniziato!`);
  };

  // Handle territory click during planning
  const handleTerritoryClick = (territoryId: string) => {
    if (gameState.phase !== 'planning' || gameState.readyStatus.blue || gameState.gameOver) return;

    const territory = gameState.territories.find(t => t.id === territoryId);
    if (!territory) return;

    // Card usage
    if (selectedCard) {
      handleCardPlanning(territoryId);
      return;
    }

    // Troop assignment (if has remaining troops)
    const playerPlan = gameState.playerPlans.blue;
    const assignedTroops = getTotalAssignedTroops(playerPlan);
    const remainingTroops = TROOPS_PER_ROUND - assignedTroops;

    if (remainingTroops > 0 && territory.owner === 'blue') {
      // Add 1 troop to this territory
      const existingAssignment = playerPlan.troopAssignments.find(a => a.territoryId === territoryId);
      
      setGameState(prev => {
        const newAssignments = [...prev.playerPlans.blue.troopAssignments];
        
        if (existingAssignment) {
          const idx = newAssignments.findIndex(a => a.territoryId === territoryId);
          newAssignments[idx] = { ...newAssignments[idx], amount: newAssignments[idx].amount + 1 };
        } else {
          newAssignments.push({ territoryId, amount: 1 });
        }

        return {
          ...prev,
          playerPlans: {
            ...prev.playerPlans,
            blue: { ...prev.playerPlans.blue, troopAssignments: newAssignments }
          }
        };
      });
      return;
    }

    // Movement planning
    if (!selectedSourceTerritory) {
      if (territory.owner === 'blue' && territory.troops > 0) {
        setSelectedSourceTerritory(territoryId);
      }
    } else {
      if (territoryId === selectedSourceTerritory) {
        setSelectedSourceTerritory(null);
      } else {
        const source = gameState.territories.find(t => t.id === selectedSourceTerritory);
        if (source && canMoveTroops(source, territory, gameState.territories)) {
          // Check platoon limit
          const currentMoves = getMovementCount(gameState.playerPlans.blue);
          const existingDest = gameState.playerPlans.blue.troopMovements.some(m => m.toId === territoryId);
          
          if (currentMoves >= MAX_PLATOONS && !existingDest) {
            toast.error(`Massimo ${MAX_PLATOONS} destinazioni per round!`);
            return;
          }

          setTargetTerritory(territoryId);
          setMoveDialogOpen(true);
        } else {
          toast.error("Non puoi spostare truppe qui");
        }
      }
    }
  };

  const handleCardPlanning = (territoryId: string) => {
    const territory = gameState.territories.find(t => t.id === territoryId);
    if (!territory || !selectedCard) return;

    let isValid = false;
    switch (selectedCard) {
      case 'reinforcement':
        isValid = territory.owner === 'blue';
        break;
      case 'bomb':
        isValid = territory.owner === 'red' && territory.troops > 0 && gameState.cardCooldowns.blue.bomb === 0;
        break;
      case 'parachute':
        isValid = territory.owner !== 'blue' && gameState.cardCooldowns.blue.parachute === 0;
        break;
      case 'force':
        isValid = territory.owner === 'blue' && territory.troops > 0 && gameState.cardCooldowns.blue.force === 0;
        break;
    }

    if (isValid) {
      setGameState(prev => ({
        ...prev,
        playerPlans: {
          ...prev.playerPlans,
          blue: {
            ...prev.playerPlans.blue,
            cardUsage: { cardType: selectedCard, targetTerritoryId: territoryId }
          }
        }
      }));
      setSelectedCard(null);
      toast.success("Carta pianificata!");
    } else {
      toast.error("Bersaglio non valido per questa carta");
    }
  };

  const handleMoveTroops = (amount: number) => {
    if (!selectedSourceTerritory || !targetTerritory) return;

    setGameState(prev => ({
      ...prev,
      playerPlans: {
        ...prev.playerPlans,
        blue: {
          ...prev.playerPlans.blue,
          troopMovements: [
            ...prev.playerPlans.blue.troopMovements,
            { fromId: selectedSourceTerritory, toId: targetTerritory, amount }
          ]
        }
      }
    }));

    setSelectedSourceTerritory(null);
    setTargetTerritory(null);
    setMoveDialogOpen(false);
    toast.success("Spostamento pianificato!");
  };

  const handlePlayerReady = () => {
    const plan = gameState.playerPlans.blue;
    const assignedTroops = getTotalAssignedTroops(plan);
    
    if (assignedTroops < TROOPS_PER_ROUND) {
      toast.error(`Devi assegnare tutte le ${TROOPS_PER_ROUND} truppe!`);
      return;
    }

    setGameState(prev => ({
      ...prev,
      readyStatus: { ...prev.readyStatus, blue: true }
    }));
    toast.success("Sei pronto! Attendi l'avversario...");
  };

  const handleCancelAssignment = (territoryId: string) => {
    setGameState(prev => ({
      ...prev,
      playerPlans: {
        ...prev.playerPlans,
        blue: {
          ...prev.playerPlans.blue,
          troopAssignments: prev.playerPlans.blue.troopAssignments.filter(a => a.territoryId !== territoryId)
        }
      }
    }));
  };

  const handleCancelMovement = (index: number) => {
    setGameState(prev => ({
      ...prev,
      playerPlans: {
        ...prev.playerPlans,
        blue: {
          ...prev.playerPlans.blue,
          troopMovements: prev.playerPlans.blue.troopMovements.filter((_, i) => i !== index)
        }
      }
    }));
  };

  const handleCancelCard = () => {
    setGameState(prev => ({
      ...prev,
      playerPlans: {
        ...prev.playerPlans,
        blue: { ...prev.playerPlans.blue, cardUsage: null }
      }
    }));
  };

  const handleGameEnd = async (won: boolean) => {
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

      await supabase.from('profiles').update({ game_elo: (userProfile.game_elo || 1200) + 20 }).eq('id', userProfile.id);
    } else {
      await supabase.from('profiles').update({ game_elo: Math.max(0, (userProfile.game_elo || 1200) - 10) }).eq('id', userProfile.id);
    }

    onGameEnd(won);
  };

  // Emoji system
  const availableEmojis = ['😊', '😎', '🔥', '💪', '👍', '😂', '🎉', '⚔️', '🏆', '💀', '😤', '🤔', '😈', '😇', '💦', '🥲', '😢', '😭', '💣', '🪖'];

  const handleEmojiClick = (emoji: string) => {
    setUserEmoji(emoji);
    setShowEmoji(false);
    setTimeout(() => setUserEmoji(null), 3000);
  };

  useEffect(() => {
    if (!gameState.gameOver) {
      const sendRandomEmoji = () => {
        const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        setOpponentEmoji(randomEmoji);
        setTimeout(() => setOpponentEmoji(null), 3000);
        const nextDelay = 60000 + Math.random() * 120000;
        return setTimeout(sendRandomEmoji, nextDelay);
      };
      const initialTimer = setTimeout(sendRandomEmoji, 60000 + Math.random() * 120000);
      return () => clearTimeout(initialTimer);
    }
  }, [gameState.gameOver]);

  const getAvatarUrl = (avatarPath?: string | null) => {
    if (!avatarPath) return "";
    if (/^https?:\/\//.test(avatarPath)) return avatarPath;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/profile-images/${avatarPath}`;
  };

  const userAvatarUrl = getAvatarUrl(userProfile?.avatar_url);
  const opponentAvatarUrl = getAvatarUrl(opponentProfile?.avatar_url);

  const blueCount = gameState.territories.filter(t => t.owner === 'blue').length;
  const reinforcementAmount = blueCount >= 28 ? 6 : blueCount >= 20 ? 4 : blueCount >= 10 ? 2 : 1;

  const playerPlan = gameState.playerPlans.blue;
  const assignedTroops = getTotalAssignedTroops(playerPlan);
  const remainingToAssign = TROOPS_PER_ROUND - assignedTroops;

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4">
      {/* Header with Profiles */}
      <div className="flex items-center justify-between gap-4">
        {/* User Profile (Blu) */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
          gameState.phase === 'resolving' && gameState.currentResolutionPlayer === 'blue'
            ? 'border-blue-500 bg-blue-500/10 shadow-lg scale-105' 
            : 'border-border/50 bg-background/50'
        }`}>
          <div className="relative">
            <Avatar className="w-12 h-12 border-2 border-blue-500">
              <AvatarImage src={userAvatarUrl} alt={userProfile?.nickname} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {userProfile?.nickname?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {gameState.readyStatus.blue && gameState.phase === 'planning' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
            )}
            {userEmoji && <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-3xl animate-bounce">{userEmoji}</div>}
          </div>
          <div className="flex-1">
            <p className="font-bold text-blue-500">{userProfile?.nickname}</p>
            <p className="text-xs text-muted-foreground">{gameState.territories.filter(t => t.owner === 'blue').length} territori</p>
            <p className="text-xs text-muted-foreground">{gameState.territories.filter(t => t.owner === 'blue').reduce((sum, t) => sum + t.troops, 0)} truppe</p>
            <p className="text-xs text-blue-400 font-semibold">ELO: {userProfile?.game_elo || 1200}</p>
          </div>
        </div>

        {/* Center - Round Info */}
        <div className="flex flex-col items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleTutorialAudio}>
            <Volume2 className="w-4 h-4" />
            {isTutorialPlaying ? 'Ferma' : 'Spiegazione'}
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <BookOpen className="w-4 h-4" />
                Regole
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Come si gioca a Conquistiator</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-xl font-bold mb-3 text-primary">🎮 Turni Simultanei</h3>
                    <p className="text-muted-foreground">Entrambi i giocatori pianificano le mosse contemporaneamente. Il turno inizia quando entrambi cliccano "PRONTO".</p>
                  </section>
                  <section>
                    <h3 className="text-xl font-bold mb-3 text-primary">📦 Ogni Round</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li><strong>6 truppe obbligatorie</strong> da assegnare ai tuoi territori</li>
                      <li><strong>Max 3 spostamenti</strong> (opzionali) verso destinazioni diverse</li>
                      <li><strong>Una carta</strong> (opzionale) da utilizzare</li>
                    </ul>
                  </section>
                  <section>
                    <h3 className="text-xl font-bold mb-3 text-primary">🃏 Le Carte</h3>
                    <ul className="space-y-2 text-muted-foreground">
                      <li><strong>Carta Rinforzi:</strong> Aggiungi truppe bonus (1-6 in base ai territori)</li>
                      <li><strong>Bombardamento:</strong> Elimina 2 truppe nemiche (cooldown 6 turni)</li>
                      <li><strong>Paracadutista:</strong> Atterra in territorio nemico (cooldown 5 turni)</li>
                      <li><strong>Potenziamento:</strong> Rendi le truppe più forti (cooldown 4 turni)</li>
                    </ul>
                  </section>
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <div className="text-3xl font-bold">⚔️ VS ⚔️</div>
          <Badge variant="outline" className="text-sm px-3 py-1">Round {gameState.roundNumber}</Badge>
          
          {gameState.phase === 'planning' && (
            <Badge variant={remainingToAssign === 0 ? "default" : "destructive"} className="px-3 py-1">
              Truppe: {assignedTroops}/{TROOPS_PER_ROUND}
            </Badge>
          )}
          
          <Button variant="outline" size="sm" onClick={() => setShowEmoji(!showEmoji)} disabled={gameState.gameOver}>😊</Button>
        </div>

        {/* Opponent Profile (Rosso) */}
        <div className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
          gameState.phase === 'resolving' && gameState.currentResolutionPlayer === 'red'
            ? 'border-red-500 bg-red-500/10 shadow-lg scale-105' 
            : 'border-border/50 bg-background/50'
        }`}>
          <div className="flex-1 text-right">
            <p className="font-bold text-red-500">{opponentProfile?.nickname}</p>
            <p className="text-xs text-muted-foreground">{gameState.territories.filter(t => t.owner === 'red').length} territori</p>
            <p className="text-xs text-muted-foreground">{gameState.territories.filter(t => t.owner === 'red').reduce((sum, t) => sum + t.troops, 0)} truppe</p>
            <p className="text-xs text-red-400 font-semibold">ELO: {opponentProfile?.game_elo || 1200}</p>
          </div>
          <div className="relative">
            <Avatar className="w-12 h-12 border-2 border-red-500">
              <AvatarImage src={opponentAvatarUrl} alt={opponentProfile?.nickname} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                {opponentProfile?.nickname?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            {gameState.readyStatus.red && gameState.phase === 'planning' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
            )}
            {opponentEmoji && <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-3xl animate-bounce">{opponentEmoji}</div>}
          </div>
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-background/95 rounded-lg border shadow-lg animate-fade-in">
          {availableEmojis.map((emoji) => (
            <Button key={emoji} variant="ghost" size="sm" onClick={() => handleEmojiClick(emoji)} className="text-2xl hover:scale-125 transition-transform">
              {emoji}
            </Button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/* Left Panel - Cards */}
        <div className="flex flex-col gap-2 w-20">
          <Card 
            className={`p-2 transition-all ${
              gameState.phase === 'planning' && !gameState.readyStatus.blue && !gameState.playerPlans.blue.cardUsage
                ? `cursor-pointer hover:scale-105 ${selectedCard === 'reinforcement' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => {
              if (gameState.phase === 'planning' && !gameState.readyStatus.blue && !gameState.playerPlans.blue.cardUsage) {
                setSelectedCard(selectedCard === 'reinforcement' ? null : 'reinforcement');
              }
            }}
          >
            <div className="flex flex-col items-center gap-1 relative">
              <img src={reinforcementCardImage} alt="Rinforzi" className="w-full h-auto rounded" />
              <span className="absolute bottom-1 text-xl font-bold text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">+{reinforcementAmount}</span>
            </div>
          </Card>
          
          <Card 
            className={`p-2 transition-all ${
              gameState.phase === 'planning' && !gameState.readyStatus.blue && gameState.cardCooldowns.blue.bomb === 0 && !gameState.playerPlans.blue.cardUsage
                ? `cursor-pointer hover:scale-105 ${selectedCard === 'bomb' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => {
              if (gameState.phase === 'planning' && !gameState.readyStatus.blue && gameState.cardCooldowns.blue.bomb === 0 && !gameState.playerPlans.blue.cardUsage) {
                setSelectedCard(selectedCard === 'bomb' ? null : 'bomb');
              }
            }}
          >
            <div className="flex flex-col items-center gap-1 relative">
              <img src={bombCardImage} alt="Bombardamento" className="w-full h-auto rounded" />
              {gameState.cardCooldowns.blue.bomb > 0 && (
                <span className="absolute bottom-1 text-xl font-bold text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{gameState.cardCooldowns.blue.bomb}</span>
              )}
            </div>
          </Card>
          
          <Card 
            className={`p-2 transition-all ${
              gameState.phase === 'planning' && !gameState.readyStatus.blue && gameState.cardCooldowns.blue.parachute === 0 && !gameState.playerPlans.blue.cardUsage
                ? `cursor-pointer hover:scale-105 ${selectedCard === 'parachute' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => {
              if (gameState.phase === 'planning' && !gameState.readyStatus.blue && gameState.cardCooldowns.blue.parachute === 0 && !gameState.playerPlans.blue.cardUsage) {
                setSelectedCard(selectedCard === 'parachute' ? null : 'parachute');
              }
            }}
          >
            <div className="flex flex-col items-center gap-1 relative">
              <img src={parachuteCardImage} alt="Paracadutista" className="w-full h-auto rounded" />
              {gameState.cardCooldowns.blue.parachute > 0 && (
                <span className="absolute bottom-1 text-xl font-bold text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{gameState.cardCooldowns.blue.parachute}</span>
              )}
            </div>
          </Card>
          
          <Card 
            className={`p-2 transition-all ${
              gameState.phase === 'planning' && !gameState.readyStatus.blue && gameState.cardCooldowns.blue.force === 0 && !gameState.playerPlans.blue.cardUsage
                ? `cursor-pointer hover:scale-105 ${selectedCard === 'force' ? 'ring-2 ring-primary bg-primary/10' : 'hover:bg-muted/50'}`
                : 'opacity-40 cursor-not-allowed'
            }`}
            onClick={() => {
              if (gameState.phase === 'planning' && !gameState.readyStatus.blue && gameState.cardCooldowns.blue.force === 0 && !gameState.playerPlans.blue.cardUsage) {
                setSelectedCard(selectedCard === 'force' ? null : 'force');
              }
            }}
          >
            <div className="flex flex-col items-center gap-1 relative">
              <img src={forceCardImage} alt="Potenziamento" className="w-full h-auto rounded" />
              {gameState.cardCooldowns.blue.force > 0 && (
                <span className="absolute bottom-1 text-xl font-bold text-primary drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{gameState.cardCooldowns.blue.force}</span>
              )}
            </div>
          </Card>
        </div>

        {/* Map */}
        <div className="flex-1 min-h-0">
          <RisikoMap
            territories={gameState.territories}
            selectedTerritory={selectedSourceTerritory}
            boostedTroops={gameState.boostedTroops}
            onTerritoryClick={handleTerritoryClick}
            disabled={gameState.phase !== 'planning' || gameState.readyStatus.blue || gameState.gameOver}
            movingTroops={movingTroops}
            arrivedTroops={null}
          />
        </div>

        {/* Right Panel - Planning Controls or Resolution Display */}
        <div className="w-64">
          {gameState.phase === 'planning' ? (
            <PlanningControls
              gameState={gameState}
              onReady={handlePlayerReady}
              onCancelAssignment={handleCancelAssignment}
              onCancelMovement={handleCancelMovement}
              onCancelCard={handleCancelCard}
              isPlayerReady={gameState.readyStatus.blue}
              isAIReady={gameState.readyStatus.red}
            />
          ) : (
            <ResolutionDisplay
              gameState={gameState}
              userProfile={userProfile}
              opponentProfile={opponentProfile}
              currentAction={currentResolutionAction}
            />
          )}
        </div>
      </div>

      {/* Move Dialog */}
      <TroopMoveDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        maxTroops={gameState.territories.find(t => t.id === selectedSourceTerritory)?.troops || 0}
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
        <BattleBanner {...battleBanner} />
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
