import { useEffect, useState, useRef } from "react";
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
  is_admin_profile?: boolean;
}

interface OpponentSearchProps {
  onOpponentFound: (opponent: Profile) => void;
}

export const OpponentSearch = ({ onOpponentFound }: OpponentSearchProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const searchDuration = useRef(Math.floor(Math.random() * 1000) + 2000); // 2-3 secondi
  const animationStarted = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchProfiles();
    
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const fetchProfiles = async () => {
    // Fetch admin profiles ordered by game_elo (now stored in DB)
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url, photos, game_elo, is_admin_profile")
      .eq("is_admin_profile", true)
      .order("game_elo", { ascending: false })
      .limit(20);

    if (adminProfiles && adminProfiles.length > 0) {
      const profilesWithAdmin = adminProfiles.map(p => ({
        ...p,
        is_admin_profile: true
      }));
      setProfiles(profilesWithAdmin);
      if (!animationStarted.current) {
        animationStarted.current = true;
        startAnimation(profilesWithAdmin);
      }
    }
  };

  const startAnimation = (profileList: Profile[]) => {
    let elapsed = 0;
    const finalIndex = Math.floor(Math.random() * profileList.length);
    const duration = searchDuration.current;
    
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        // Negli ultimi secondi, rallenta verso il profilo finale
        if (elapsed >= duration - 800) {
          return finalIndex;
        }
        return (prev + 1) % profileList.length;
      });
      elapsed += 150;

      if (elapsed >= duration) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        // Usa il profilo su cui si è fermata l'animazione con l'ELO dal DB
        const selectedOpponent = profileList[finalIndex];
        
        console.log('🎮 Opponent found from DB:', selectedOpponent.nickname, 'ELO:', selectedOpponent.game_elo);
        
        // Chiama immediatamente senza setTimeout aggiuntivo
        console.log('🎮 Calling onOpponentFound with:', selectedOpponent);
        onOpponentFound(selectedOpponent);
      }
    }, 150);
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
          <p className="text-sm text-muted-foreground">ELO: {profiles[currentIndex]?.game_elo || 1200}</p>
        </div>
      </div>
    </Card>
  );
};