import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

interface OpponentSearchProps {
  onOpponentFound: (opponent: Profile) => void;
}

export const OpponentSearch = ({ onOpponentFound }: OpponentSearchProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchDuration] = useState(
    Math.floor(Math.random() * 8000) + 7000
  ); // 7-15 secondi

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch admin profiles that user hasn't matched with
    const { data: matches } = await supabase
      .from("matches")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`);

    const matchedIds = matches
      ? matches.map((m) =>
          m.user1_id === session.user.id ? m.user2_id : m.user1_id
        )
      : [];

    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .eq("is_admin_profile", true)
      .not("id", "in", `(${matchedIds.join(",") || "null"})`);

    if (adminProfiles && adminProfiles.length > 0) {
      setProfiles(adminProfiles);
      startAnimation(adminProfiles);
    }
  };

  const startAnimation = (profileList: Profile[]) => {
    let elapsed = 0;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % profileList.length);
      elapsed += 150;

      if (elapsed >= searchDuration) {
        clearInterval(interval);
        // Pick random opponent
        const randomOpponent =
          profileList[Math.floor(Math.random() * profileList.length)];
        setTimeout(() => {
          onOpponentFound(randomOpponent);
        }, 500);
      }
    }, 150);
  };

  if (profiles.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
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
          <AvatarImage src={profiles[currentIndex]?.avatar_url || ""} />
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
