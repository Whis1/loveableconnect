import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, X, Loader2, Clock } from "lucide-react";
import { OpponentSearch } from "./OpponentSearch";
import { TrisBoard } from "./TrisBoard";
import { CheckersBoard } from "./CheckersBoard";
import { EloLeaderboard } from "./EloLeaderboard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";
import { InsufficientCreditsBanner } from "@/components/chat/InsufficientCreditsBanner";
import trisIcon from "@/assets/tris-icon.png";
import damaIcon from "@/assets/dama-icon.png";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  game_elo?: number;
}

export const TrisGameBanner = ({ variant = "banner" }: { variant?: "banner" | "page" }) => {
  const [showBanner, setShowBanner] = useState(variant === "page");
  const [gameState, setGameState] = useState<"idle" | "selecting" | "searching" | "playing">("idle");
  const [selectedGame, setSelectedGame] = useState<"tris" | "dama" | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [nextResetTime, setNextResetTime] = useState<Date | null>(null);
  const [userCredits, setUserCredits] = useState(0);
  // Banner "Crediti insufficienti" mostrato quando l'utente cerca di
  // giocare una partita extra senza i 2 crediti necessari (al posto del
  // toast rosso in basso a destra).
  const [showInsufficientCreditsBanner, setShowInsufficientCreditsBanner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { credits } = useCredits();
  const navigate = useNavigate();

  // In modalità pagina la chiusura riporta alla home; come banner nasconde il riquadro.
  const exitGames = () => {
    if (variant === "page") navigate("/");
    else setShowBanner(false);
  };

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setCurrentUserId(session.user.id);
        
        console.log('🎮 Fetching current user profile for:', session.user.id);
        // Fetch current user profile
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        if (error) {
          console.error('❌ Error fetching profile:', error);
        } else if (profile) {
          console.log('✅ Current user profile loaded:', profile.nickname);
          setCurrentUserProfile(profile);
        }
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    checkGamesRemaining();
  }, []);

  // Ricarica i dati quando il banner si riapre
  useEffect(() => {
    if (showBanner && gameState === "idle") {
      checkGamesRemaining();
    }
  }, [showBanner, gameState]);

  // Mantieni il saldo locale sincronizzato per feedback immediato
  useEffect(() => {
    if (credits?.balance !== undefined) {
      setUserCredits(credits.balance);
    }
  }, [credits?.balance]);

  const hasActiveSubscription = () => Boolean(
    credits?.is_premium &&
    (!credits.premium_expires_at || new Date(credits.premium_expires_at) > new Date())
  );

  const hasUnlimitedGames = () => Boolean(
    hasActiveSubscription() &&
    credits?.subscription_type === 'monthly' &&
    (!credits.premium_tier || credits.premium_tier === 'premium')
  );

  // Calcola il limite di partite in base all'abbonamento
  const getGameLimit = () => {
    if (hasUnlimitedGames()) return Number.POSITIVE_INFINITY; // Premium illimitato
    if (hasActiveSubscription() && credits?.subscription_type === 'monthly' && credits.premium_tier === 'standard') return 20; // Platino
    if (hasActiveSubscription() && credits?.subscription_type === 'weekly') return 10;
    return 5; // Free
  };

  // Evita il flash iniziale di 5/5: non mostrare valori finché i crediti non sono caricati
  const getDisplayLimit = () => {
    return credits ? getGameLimit() : null;
  };

  const checkGamesRemaining = async () => {
    console.log('🔍 checkGamesRemaining - START');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('❌ checkGamesRemaining - No session');
      return;
    }

    console.log('🔍 Querying tris_games for user:', session.user.id);
    const { data, error } = await supabase
      .from("tris_games")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("❌ Error checking games:", error);
      return;
    }

    if (!data) {
      console.log('📝 No tris_games record found, creating new one');
      const { error: insertError } = await supabase.from("tris_games").insert({
        user_id: session.user.id,
        games_played_today: 0,
        last_reset_date: new Date().toISOString().split("T")[0],
      });
      
      if (insertError) {
        console.error("❌ Error creating tris_games record:", insertError);
      }
      console.log('✅ Setting gamesPlayed to 0');
      setGamesPlayed(0);
    } else {
      const today = new Date().toISOString().split("T")[0];
      console.log('📊 Found tris_games data:', {
        games_played_today: data.games_played_today,
        last_reset_date: data.last_reset_date,
        today: today
      });
      
      if (data.last_reset_date !== today) {
        console.log('🔄 Date mismatch - resetting games');
        const { error: updateError } = await supabase
          .from("tris_games")
          .update({
            games_played_today: 0,
            last_reset_date: today,
          })
          .eq("user_id", session.user.id);
          
        if (updateError) {
          console.error("❌ Error resetting daily games:", updateError);
        }
        console.log('✅ Setting gamesPlayed to 0 (reset)');
        setGamesPlayed(0);
      } else {
        console.log('✅ Date matches - setting gamesPlayed to:', data.games_played_today);
        setGamesPlayed(data.games_played_today);
        const limit = getGameLimit();
        if (data.games_played_today >= limit) {
          const resetDate = new Date(data.last_reset_date);
          resetDate.setDate(resetDate.getDate() + 1);
          setNextResetTime(resetDate);
        }
      }
    }
    console.log('🔍 checkGamesRemaining - END');
  };

  const handleStartGame = async () => {
    const limit = getGameLimit();
    
    // Solo monthly premium (tier premium) ha giochi illimitati
    if (hasUnlimitedGames()) {
      setGameState("selecting");
      return;
    }

    if (gamesPlayed >= limit) {
      // Check if user has enough credits to play
      if (userCredits < 2) {
        // Banner centrato con tasto "Ricarica o Abbonati" al posto del
        // toast rosso (richiesta utente: piu' visibile e con call-to-action).
        setShowInsufficientCreditsBanner(true);
        return;
      }

      // Scala 2 crediti tramite la funzione RPC: l'update diretto sulla
      // tabella user_credits è bloccato dalle policy di sicurezza.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: deducted, error: deductError } = await supabase.rpc("deduct_credits", {
        _user_id: session.user.id,
        _amount: 2,
      });

      if (deductError || deducted !== true) {
        toast({
          title: "Crediti insufficienti",
          description: "Non è stato possibile usare i 2 crediti. Riprova.",
          variant: "destructive",
        });
        return;
      }

      setUserCredits((prev) => Math.max(0, prev - 2));

      toast({
        title: "Partita extra",
        description: "Hai speso 2 crediti per giocare un'altra partita!",
      });
    }
    setGameState("selecting");
  };

  const handleGameSelect = (game: "tris" | "dama") => {
    console.log('🎮 Game selected:', game);
    setSelectedGame(game);
    setGameState("searching");
  };

   // Incrementa le partite giocate - ASYNC per garantire persistenza
   const incrementGamesPlayed = async (): Promise<number> => {
     const { data: { session } } = await supabase.auth.getSession();
     if (!session) throw new Error('No session');
 
     const newGamesPlayed = gamesPlayed + 1;
     const today = new Date().toISOString().split("T")[0];
     
     // CRITICO: Attendere l'aggiornamento del database prima di procedere
     const { error } = await supabase
       .from("tris_games")
       .update({ 
         games_played_today: newGamesPlayed,
         last_reset_date: today
       })
       .eq("user_id", session.user.id);
     
     if (error) throw error;
     
     // Aggiorna lo stato locale SOLO dopo il successo del database
     setGamesPlayed(newGamesPlayed);
 
     // Check if reached free limit
     const limit = getGameLimit();
     if (newGamesPlayed >= limit && !hasUnlimitedGames()) {
       const tomorrow = new Date();
       tomorrow.setDate(tomorrow.getDate() + 1);
       setNextResetTime(tomorrow);
     }
 
     return newGamesPlayed;
   };
 
   // Retry mechanism per incrementGamesPlayed
   const incrementGamesPlayedWithRetry = async (retries = 3): Promise<number> => {
     for (let i = 0; i < retries; i++) {
       try {
         return await incrementGamesPlayed();
       } catch (error) {
         if (i === retries - 1) throw error;
         await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
       }
     }
     throw new Error('Max retries reached');
   };

   const handleOpponentFound = async (foundOpponent: Profile) => {
     try {
       // Il Premium mensile e' davvero illimitato: non incrementiamo il contatore giornaliero.
       if (!hasUnlimitedGames()) {
         // CRITICO: Attendere l'aggiornamento PRIMA di avviare il gioco
         await incrementGamesPlayedWithRetry();
       }
       
       setOpponent(foundOpponent);
       setGameState("playing");
       
       const remaining = hasUnlimitedGames() ? "∞" : getGameLimit() - gamesPlayed;
       const limitLabel = hasUnlimitedGames() ? "∞" : getGameLimit();
       toast({
         title: "Partita avviata!",
         description: `Partite rimanenti oggi: ${remaining}/${limitLabel}`,
       });
     } catch (error) {
       console.error('Errore aggiornamento partite:', error);
       toast({
         title: "Errore",
         description: "Impossibile avviare la partita. Riprova.",
         variant: "destructive",
       });
       setGameState("idle");
     }
  };

  const handleGameEnd = async (result: "win" | "lose" | "draw") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Award credits if win
    if (result === "win") {
      // Accredita 6 crediti tramite la RPC (importo negativo = aggiunta):
      // l'update diretto su user_credits è bloccato dalle policy di sicurezza.
      const { error: awardError } = await supabase.rpc("deduct_credits", {
        _user_id: session.user.id,
        _amount: -6,
      });

      if (!awardError) {
        setUserCredits((prev) => prev + 6);
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

    // Ricarica i dati dal DB prima di resettare
    await checkGamesRemaining();

    // Reset game
    setTimeout(() => {
      setGameState("idle");
      setSelectedGame(null);
      setOpponent(null);
      if (variant !== "page") setShowBanner(false);
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

  // Formato breve "8h 29m" stile counter Like/Crediti per il countdown
  // mostrato sotto la riga "Partite gratuite oggi".
  const getTimeRemainingShort = () => {
    if (!nextResetTime) return "";
    const now = new Date();
    const diff = nextResetTime.getTime() - now.getTime();
    if (diff <= 0) return "";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
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
    const limit = getDisplayLimit();
    const remaining = limit ? Math.max(0, limit - gamesPlayed) : null;
    const isPremiumUnlimited = hasUnlimitedGames();
    
    console.log('🎯 Rendering main button - gamesPlayed:', gamesPlayed, 'limit:', limit, 'remaining:', remaining);
    
    return (
      <div className="flex justify-center mb-6">
        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={() => setShowBanner(true)}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Sfida
          </Button>
          {remaining !== null && (
            <p className="text-xs text-muted-foreground">
              {isPremiumUnlimited ? (
                <span className="text-primary font-semibold">♾️ Illimitato</span>
              ) : (
                <>Partite oggi: <span className="font-bold text-primary">{remaining}/{limit}</span></>
              )}
            </p>
          )}
        </div>
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
              if (variant !== "page") setShowBanner(false);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    console.log('🎮 Rendering OpponentSearch, selectedGame:', selectedGame);
    return <OpponentSearch onOpponentFound={handleOpponentFound} />;
  }

  console.log('🎮 Current state:', { gameState, opponent: opponent?.nickname, selectedGame });

  if (gameState === "playing" && opponent && selectedGame === "tris") {
    console.log('🎮 Rendering TrisBoard');
    return <TrisBoard opponent={opponent} onGameEnd={handleGameEnd} />;
  }

  if (gameState === "playing" && opponent && selectedGame === "dama") {
    console.log('🎮 Rendering CheckersBoard');
    return <CheckersBoard opponent={opponent} onGameEnd={handleGameEnd} />;
  }


  return (
    <Card className="mb-6 p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold">🎮 Sfida gli utenti per vincere crediti</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={exitGames}
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
        ) : hasUnlimitedGames() ? (
          <p className="text-muted-foreground text-center">
            🌟 <span className="font-bold text-primary">Giochi illimitati</span> con il tuo abbonamento Premium Mensile!
          </p>
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground">
              Partite gratuite oggi: <span className="font-bold text-primary">{Math.max(0, getGameLimit() - gamesPlayed)}</span>/{getGameLimit()}
              {hasActiveSubscription() && credits.subscription_type === 'monthly' && credits.premium_tier === 'standard' && (
                <span className="block text-xs mt-1">💎 Abbonamento Platino</span>
              )}
              {hasActiveSubscription() && credits.subscription_type === 'weekly' && (
                <span className="block text-xs mt-1">✨ Bonus Premium Settimanale</span>
              )}
            </p>
            {/* Countdown 24h stile counter Like/Crediti: mostrato solo se
                l'utente ha gia' usato almeno una partita gratuita (altrimenti
                non serve sapere quando si "rinnova"). */}
            {nextResetTime && gamesPlayed > 0 && (
              <div
                className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1"
                title="Rinnovo giornaliero"
              >
                <Clock className="h-3 w-3" />
                <span>{getTimeRemainingShort()}</span>
              </div>
            )}
          </div>
        )}

        {/* Bottone gioca: stile diverso quando l'utente non puo' permettersi
            la partita extra (partite gratuite finite + crediti < 2). Il
            bottone resta cliccabile per mostrare il banner "Crediti
            insufficienti" con tasto "Ricarica o Abbonati", non il toast. */}
        {(() => {
          const limit = getGameLimit();
          const needsCredits =
            gamesPlayed >= limit && !hasUnlimitedGames();
          const cantAfford = needsCredits && userCredits < 2;
          return (
            <div className="flex justify-center">
              <Button
                onClick={handleStartGame}
                className={
                  cantAfford
                    ? "px-8 bg-primary/30 hover:bg-primary/40 text-foreground/60 cursor-not-allowed border border-primary/30"
                    : "px-8 bg-primary hover:bg-primary/90"
                }
              >
                <Trophy className="w-4 h-4 mr-2" />
                {needsCredits ? "Gioca con 2 crediti" : "Iniziare a giocare"}
              </Button>
            </div>
          );
        })()}
      </div>

      {/* Banner "Crediti insufficienti" — mostrato quando l'utente
          tenta di giocare senza i 2 crediti necessari. Contiene il
          tasto "Ricarica o Abbonati" che porta a /credits. */}
      <InsufficientCreditsBanner
        isVisible={showInsufficientCreditsBanner}
        onClose={() => setShowInsufficientCreditsBanner(false)}
      />
    </Card>
  );
};
