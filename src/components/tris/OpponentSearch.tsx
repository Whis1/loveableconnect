import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  photos: string[] | null;
  game_elo?: number;
}

interface OpponentSearchProps {
  onOpponentFound: (opponent: Profile) => void;
}

const STORAGE_KEY = 'elo_leaderboard_data';

interface StoredLeaderboardData {
  adminElos: Record<string, number>;
  lastUpdate: string;
}

export const OpponentSearch = ({ onOpponentFound }: OpponentSearchProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchDuration] = useState(
    Math.floor(Math.random() * 2000) + 3000
  ); // 3-5 secondi

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    // Fetch ALL admin profiles - sono bot, sempre disponibili
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url, photos, game_elo")
      .eq("is_admin_profile", true);

    if (adminProfiles && adminProfiles.length > 0) {
      setProfiles(adminProfiles);
      startAnimation(adminProfiles);
    }
  };

  const startAnimation = (profileList: Profile[]) => {
    let elapsed = 0;
    let finalIndex = Math.floor(Math.random() * profileList.length);
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        // Negli ultimi secondi, rallenta verso il profilo finale
        if (elapsed >= searchDuration - 1000) {
          return finalIndex;
        }
        return (prev + 1) % profileList.length;
      });
      elapsed += 150;

      if (elapsed >= searchDuration) {
        clearInterval(interval);
        
        // Usa il profilo su cui si è fermata l'animazione
        const selectedOpponent = profileList[finalIndex];
        
        // Check if opponent is in TOP 5 leaderboard and use that ELO
        const leaderboardOpponent = getOpponentWithLeaderboardElo(selectedOpponent);
        
        setTimeout(() => {
          onOpponentFound(leaderboardOpponent);
        }, 500);
      }
    }, 150);
  };

  const getOpponentWithLeaderboardElo = (opponent: Profile): Profile => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredLeaderboardData = JSON.parse(stored);
        // If this opponent has an ELO in the leaderboard, use that instead
        if (data.adminElos[opponent.id]) {
          console.log(`Using leaderboard ELO ${data.adminElos[opponent.id]} for ${opponent.nickname} (DB ELO: ${opponent.game_elo})`);
          return {
            ...opponent,
            game_elo: data.adminElos[opponent.id]
          };
        }
      }
    } catch (error) {
      console.error("Error reading leaderboard data:", error);
    }
    
    // Fallback to database ELO
    return opponent;
  };

  if (profiles.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p>Ricerca sfidanti in corso...</p>
      </Card>
    );
  }

  return (
    <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
      <h3 className="text-xl font-bold mb-4">🔍 Ricerca sfidante...</h3>
      <div className="flex justify-center items-center space-x-4 animate-pulse">
        <Avatar className="w-20 h-20 border-4 border-primary">
          <AvatarImage 
            src={
              profiles[currentIndex]?.avatar_url
                ? supabase.storage.from('profile-images').getPublicUrl(profiles[currentIndex].avatar_url).data.publicUrl
                : (profiles[currentIndex]?.photos && profiles[currentIndex].photos.length > 0 
                    ? supabase.storage.from('profile-images').getPublicUrl(profiles[currentIndex].photos[0]).data.publicUrl
                    : "")
            }
          />
          <AvatarFallback>
            {profiles[currentIndex]?.nickname.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold text-lg">{profiles[currentIndex]?.nickname}</p>
          <p className="text-sm text-muted-foreground">Cercando...</p>
        </div>
      </div>
    </Card>
  );
};
