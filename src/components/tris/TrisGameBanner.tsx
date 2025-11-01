import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, X } from "lucide-react";
import { OpponentSearch } from "./OpponentSearch";
import { TrisBoard } from "./TrisBoard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

export const TrisGameBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [gameState, setGameState] = useState<"idle" | "searching" | "playing">("idle");
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [nextResetTime, setNextResetTime] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkGamesRemaining();
  }, []);

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
        if (data.games_played_today >= 3) {
          const resetDate = new Date(data.last_reset_date);
          resetDate.setDate(resetDate.getDate() + 1);
          setNextResetTime(resetDate);
        }
      }
    }
  };

  const handleStartGame = () => {
    if (gamesPlayed >= 3) {
      toast({
        title: "Limite raggiunto",
        description: "Hai esaurito le tue sfide giornaliere!",
        variant: "destructive",
      });
      return;
    }
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
          .update({ balance: credits.balance + 5 })
          .eq("user_id", session.user.id);

        toast({
          title: "🎉 Complimenti!",
          description: "Hai vinto la sfida e guadagnato +5 crediti!",
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

    // Check if reached limit
    if (newGamesPlayed >= 3) {
      const today = new Date();
      today.setDate(today.getDate() + 1);
      setNextResetTime(today);
    }

    // Reset game
    setTimeout(() => {
      setGameState("idle");
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

  if (gameState === "searching") {
    return <OpponentSearch onOpponentFound={handleOpponentFound} />;
  }

  if (gameState === "playing" && opponent) {
    return <TrisBoard opponent={opponent} onGameEnd={handleGameEnd} />;
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

      {gamesPlayed >= 3 ? (
        <div className="text-center py-4">
          <p className="text-lg mb-2">Hai esaurito le tue sfide giornaliere!</p>
          <p className="text-muted-foreground">
            Torna tra <span className="font-bold text-primary">{getTimeRemaining()}</span> per giocare di nuovo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Partite rimanenti oggi: <span className="font-bold text-primary">{3 - gamesPlayed}</span>/3
          </p>
          <Button
            onClick={handleStartGame}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Iniziare a giocare
          </Button>
        </div>
      )}
    </Card>
  );
};
