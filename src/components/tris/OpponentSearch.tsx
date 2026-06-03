import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { computeAdminElos } from "@/lib/adminElo";
import { profileImageUrl } from "@/lib/imageUrl";
import { ProfileThemeRing } from "@/components/ProfileThemeRing";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  photos: string[] | null;
  game_elo?: number;
  is_admin_profile?: boolean;
  profile_theme?: string | null;
}

interface OpponentSearchProps {
  onOpponentFound: (opponent: Profile) => void;
}

export const OpponentSearch = ({ onOpponentFound }: OpponentSearchProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // 🎰 Durata ricerca sfidante: random tra 5 e 10 secondi (inclusi).
  // Math.random() * 6 → [0, 6), Math.floor() → 0..5, + 5 → 5..10 ✓
  const searchDuration = useRef((Math.floor(Math.random() * 6) + 5) * 1000);
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
    // Tutti i profili admin: serve l'elenco completo per calcolare gli ELO
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url, photos, game_elo, is_admin_profile, profile_theme")
      .eq("is_admin_profile", true);

    if (adminProfiles && adminProfiles.length > 0) {
      // ELO simulati: stesso valore mostrato in classifica
      const adminElos = computeAdminElos(adminProfiles);
      const profilesWithElo = adminProfiles.map(p => ({
        ...p,
        is_admin_profile: true,
        game_elo: adminElos.get(p.id) ?? 1200,
      }));
      setProfiles(profilesWithElo);
      if (!animationStarted.current) {
        animationStarted.current = true;
        startAnimation(profilesWithElo);
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
        <ProfileThemeRing themeId={profiles[currentIndex]?.profile_theme}>
          <Avatar className="w-20 h-20 border-4 border-primary">
            <AvatarImage
              src={
                profiles[currentIndex]?.avatar_url
                  ? profileImageUrl(profiles[currentIndex].avatar_url, "card")
                  : (profiles[currentIndex]?.photos && profiles[currentIndex].photos.length > 0
                      ? profileImageUrl(profiles[currentIndex].photos[0], "card")
                      : "")
              }
            />
            <AvatarFallback>
              {profiles[currentIndex]?.nickname.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </ProfileThemeRing>
        <div>
          <p className="font-bold text-lg">{profiles[currentIndex]?.nickname}</p>
          <p className="text-sm text-muted-foreground">ELO: {profiles[currentIndex]?.game_elo || 1200}</p>
        </div>
      </div>
    </Card>
  );
};