import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, X } from "lucide-react";
import { OpponentSearch } from "./OpponentSearch";
import { TrisBoard } from "./TrisBoard";
import { CheckersBoard } from "./CheckersBoard";
import { RisikoBoard } from "../risiko/RisikoBoard";
import { EloLeaderboard } from "./EloLeaderboard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import trisIcon from "@/assets/tris-icon.png";
import damaIcon from "@/assets/dama-icon.png";
import risikoIcon from "@/assets/risiko-icon.png";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  game_elo?: number;
}

export const TrisGameBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "selecting" | "searching" | "playing">("idle");
  const [selectedGame, setSelectedGame] = useState<"tris" | "dama" | "risiko" | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [nextResetTime, setNextResetTime] = useState<Date | null>(null);
  const [userCredits, setUserCredits] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { credits } = useCredits();

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        
        // Fetch current user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        if (profile) {
          setCurrentUserProfile(profile);
        }
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    checkGamesRemaining();
  }, []);

  // Mantieni il saldo locale sincronizzato per feedback immediato
  useEffect(() => {
    if (credits?.balance !== undefined) {
      setUserCredits(credits.balance);
    }
  }, [credits?.balance]);

  // Calcola il limite di partite in base all'abbonamento
  const getGameLimit = () => {
    if (credits?.is_premium && credits.subscription_type === 'monthly' && (!credits.premium_tier || credits.premium_tier === 'premium')) return 999; // Premium illimitato
    if (credits?.is_premium && credits.subscription_type === 'monthly' && credits.premium_tier === 'standard') return 20; // Platino
    if (credits?.is_premium && credits.subscription_type === 'weekly') return 10;
    return 5; // Free
  };

  // Evita il flash iniziale di 5/5: non mostrare valori finché i crediti non sono caricati
  const getDisplayLimit = () => {
    return credits ? getGameLimit() : null;
  };

  const checkGamesRemaining = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("tris_games")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking games:", error);
      return;
    }

    if (!data) {
      // Create new record
      await supabase.from("tris_games").insert({
        user_id: session.user.id,
        games_played_today: 0,
        last_reset_date: new Date().toISOString().split("T")[0],
      });
      setGamesPlayed(0);
    } else {
      const today = new Date().toISOString().split("T")[0];
      if (data.last_reset_date !== today) {
        // Reset games
        await supabase
          .from("tris_games")
          .update({
            games_played_today: 0,
            last_reset_date: today,
          })
          .eq("user_id", session.user.id);
        setGamesPlayed(0);
      } else {
        setGamesPlayed(data.games_played_today);
        const limit = getGameLimit();
        if (data.games_played_today >= limit) {
          const resetDate = new Date(data.last_reset_date);
          resetDate.setDate(resetDate.getDate() + 1);
          setNextResetTime(resetDate);
        }
      }
    }
  };

  const handleStartGame = async () => {
    const limit = getGameLimit();
    
    // Solo monthly premium (tier premium) ha giochi illimitati
    if (credits?.is_premium && credits.subscription_type === 'monthly' && (!credits.premium_tier || credits.premium_tier === 'premium')) {
      setGameState("selecting");
      return;
    }

    if (gamesPlayed >= limit) {
      // Check if user has enough credits to play
      if (userCredits < 2) {
        toast({
          title: "Crediti insufficienti",
          description: "Hai bisogno di 2 crediti per giocare un'altra partita!",
          variant: "destructive",
        });
        return;
      }

      // Deduct 2 credits
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: credits } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", session.user.id)
        .single();

      if (credits) {
        await supabase
          .from("user_credits")
          .update({ balance: credits.balance - 2 })
          .eq("user_id", session.user.id);

        setUserCredits(credits.balance - 2);

        toast({
          title: "Partita extra",
          description: "Hai speso 2 crediti per giocare un'altra partita!",
        });
      }
    }
    setGameState("selecting");
  };

  const handleGameSelect = (game: "tris" | "dama" | "risiko") => {
    setSelectedGame(game);
    setGameState("searching");
  };

  const handleOpponentFound = (foundOpponent: Profile) => {
    setOpponent(foundOpponent);
    setGameState("playing");
  };

  const handleGameEnd = async (result: "win" | "lose" | "draw") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Update games played
    const newGamesPlayed = gamesPlayed + 1;
    await supabase
      .from("tris_games")
      .update({ games_played_today: newGamesPlayed })
      .eq("user_id", session.user.id);

    setGamesPlayed(newGamesPlayed);

    // Award credits if win
    if (result === "win") {
      const { data: credits } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", session.user.id)
        .single();

      if (credits) {
        await supabase
          .from("user_credits")
          .update({ balance: credits.balance + 6 })
          .eq("user_id", session.user.id);

        setUserCredits(credits.balance + 6);

        toast({
          title: "🎉 Complimenti!",
          description: "Hai vinto la sfida e guadagnato +6 crediti!",
        });
      }
    } else if (result === "draw") {
      toast({
        title: "Pareggio!",
        description: "Riprova la prossima volta.",
      });
    } else {
      toast({
        title: "Hai perso!",
        description: "Non arrenderti, riprova la prossima volta.",
      });
    }

    // Check if reached free limit
    const limit = getGameLimit();
    if (newGamesPlayed >= limit && !(credits?.is_premium && credits.subscription_type === 'monthly' && (!credits.premium_tier || credits.premium_tier === 'premium'))) {
      const today = new Date();
      today.setDate(today.getDate() + 1);
      setNextResetTime(today);
    }

    // Reset game
    setTimeout(() => {
      setGameState("idle");
      setSelectedGame(null);
      setOpponent(null);
      setShowBanner(false);
    }, 3000);
  };

  const getTimeRemaining = () => {
    if (!nextResetTime) return "";
    const now = new Date();
    const diff = nextResetTime.getTime() - now.getTime();
    if (diff <= 0) return "00:00:00";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (nextResetTime) {
      const interval = setInterval(() => {
        const now = new Date();
        if (now >= nextResetTime) {
          checkGamesRemaining();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [nextResetTime]);

  if (!showBanner && gameState === "idle") {
    return (
      <div className="flex justify-center mb-6">
        <Button
          onClick={() => setShowBanner(true)}
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          <Trophy className="w-4 h-4 mr-2" />
          Sfida
        </Button>
      </div>
    );
  }

  if (gameState === "selecting") {
    return (
      <Card className="mb-6 p-8 bg-gradient-to-br from-primary/15 via-secondary/10 to-primary/10 border-primary/30 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              🎮 Scegli il tuo gioco
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Sfida altri utenti e scala la classifica ELO. Ogni vittoria aumenta il tuo punteggio e ottieni 6 crediti!
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setGameState("idle");
              setShowBanner(false);
            }}
            className="hover:bg-primary/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* ELO Leaderboard */}
        <div className="mb-6">
          <EloLeaderboard userId={currentUserId || undefined} />
        </div>

        {/* ELO Explanation */}
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1 text-primary">Cos&apos;è l&apos;ELO?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Il sistema ELO misura il livello della tua abilità di gioco. Parti da 1200 punti: se vinci acquisisci +20 ELO, 
                se perdi scendi di -10. Più alto è il tuo ELO, più dimostri la tua bravura! 🏆
              </p>
            </div>
          </div>
        </div>
        
        {/* Game Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => handleGameSelect("tris")}
            className="h-auto p-6 flex flex-col items-center gap-4 bg-gradient-to-br from-blue-500/20 via-blue-600/15 to-blue-700/20 hover:from-blue-500/30 hover:via-blue-600/25 hover:to-blue-700/30 border-2 border-blue-500/40 hover:border-blue-400/60 transition-all duration-300 hover:scale-105 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="w-20 h-20 flex items-center justify-center">
              <img src={trisIcon} alt="Tris" className="w-full h-full object-contain drop-shadow-lg" />
            </div>
            <div className="text-center z-10">
              <span className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-blue-400 via-blue-300 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(59,130,246,0.5)]">
                TRIS
              </span>
            </div>
          </Button>
          
          <Button
            onClick={() => handleGameSelect("dama")}
            className="h-auto p-6 flex flex-col items-center gap-4 bg-gradient-to-br from-purple-500/20 via-purple-600/15 to-purple-700/20 hover:from-purple-500/30 hover:via-purple-600/25 hover:to-purple-700/30 border-2 border-purple-500/40 hover:border-purple-400/60 transition-all duration-300 hover:scale-105 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="w-20 h-20 flex items-center justify-center">
              <img src={damaIcon} alt="Dama" className="w-full h-full object-contain drop-shadow-lg" />
            </div>
            <div className="text-center z-10">
              <span className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-purple-400 via-purple-300 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(168,85,247,0.5)]">
                DAMA
              </span>
            </div>
          </Button>

          <Button
            onClick={() => handleGameSelect("risiko")}
            className="h-auto p-6 flex flex-col items-center gap-4 bg-gradient-to-br from-red-500/20 via-orange-600/15 to-yellow-700/20 hover:from-red-500/30 hover:via-orange-600/25 hover:to-yellow-700/30 border-2 border-red-500/40 hover:border-red-400/60 transition-all duration-300 hover:scale-105 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="w-20 h-20 flex items-center justify-center">
              <img src={risikoIcon} alt="Risiko" className="w-full h-full object-contain drop-shadow-lg" />
            </div>
            <div className="text-center z-10">
              <span className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-red-400 via-orange-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(239,68,68,0.5)]">
                RISIKO
              </span>
            </div>
          </Button>
        </div>

        {/* Stats Footer */}
        <div className="mt-6 pt-4 border-t border-primary/20 text-center">
          <p className="text-xs text-muted-foreground">
            💎 Vinci per guadagnare crediti e aumentare il tuo ELO!
          </p>
        </div>
      </Card>
    );
  }

  if (gameState === "searching") {
    return <OpponentSearch onOpponentFound={handleOpponentFound} />;
  }

  if (gameState === "playing" && opponent && selectedGame === "tris") {
    return <TrisBoard opponent={opponent} onGameEnd={handleGameEnd} />;
  }

  if (gameState === "playing" && opponent && selectedGame === "dama") {
    return <CheckersBoard opponent={opponent} onGameEnd={handleGameEnd} />;
  }

  if (gameState === "playing" && opponent && selectedGame === "risiko" && currentUserProfile) {
    return <RisikoBoard userProfile={currentUserProfile} opponentProfile={opponent} onGameEnd={(won) => handleGameEnd(won ? "win" : "lose")} />;
  }

  return (
    <Card className="mb-6 p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">🎮 Sfida gli utenti per vincere crediti</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowBanner(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {!credits ? (
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            </div>
          </div>
        ) : credits.is_premium && credits.subscription_type === 'monthly' && (!credits.premium_tier || credits.premium_tier === 'premium') ? (
          <p className="text-muted-foreground text-center">
            🌟 <span className="font-bold text-primary">Giochi illimitati</span> con il tuo abbonamento Premium Mensile!
          </p>
        ) : (
          <p className="text-muted-foreground text-center">
            Partite gratuite oggi: <span className="font-bold text-primary">{Math.max(0, getGameLimit() - gamesPlayed)}</span>/{getGameLimit()}
            {credits.is_premium && credits.subscription_type === 'monthly' && credits.premium_tier === 'standard' && (
              <span className="block text-xs mt-1">💎 Abbonamento Platino</span>
            )}
            {credits.is_premium && credits.subscription_type === 'weekly' && (
              <span className="block text-xs mt-1">✨ Bonus Premium Settimanale</span>
            )}
          </p>
        )}

        {gamesPlayed >= getGameLimit() && userCredits < 2 && !(credits?.is_premium && credits.subscription_type === 'monthly' && (!credits.premium_tier || credits.premium_tier === 'premium')) ? (
          <div className="text-center py-4">
            <p className="text-lg mb-2">Hai esaurito le tue sfide giornaliere!</p>
            <p className="text-muted-foreground">
              Torna tra <span className="font-bold text-primary">{getTimeRemaining()}</span> per giocare di nuovo gratuitamente.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Oppure ottieni più crediti per continuare a giocare!
            </p>
          </div>
        ) : (
          <Button
            onClick={handleStartGame}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Trophy className="w-4 h-4 mr-2" />
            {gamesPlayed >= getGameLimit() && !(credits?.is_premium && credits.subscription_type === 'monthly' && (!credits.premium_tier || credits.premium_tier === 'premium')) 
              ? "Gioca con 2 crediti" 
              : "Iniziare a giocare"}
          </Button>
        )}
      </div>
    </Card>
  );
};
