import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, ChevronDown, ChevronUp } from "lucide-react";

interface LeaderboardProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  tris_elo: number;
  is_admin_profile: boolean;
}

interface EloLeaderboardProps {
  userId?: string;
}

const STORAGE_KEY = 'elo_leaderboard_data';
const UPDATE_INTERVAL = 20 * 60 * 1000; // 20 minutes in milliseconds

interface StoredLeaderboardData {
  adminElos: Record<string, number>;
  lastUpdate: string;
}

export const EloLeaderboard = ({ userId }: EloLeaderboardProps) => {
  const [topPlayers, setTopPlayers] = useState<LeaderboardProfile[]>([]);
  const [userElo, setUserElo] = useState<number>(1200);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [adminElos, setAdminElos] = useState<Map<string, number>>(new Map());
  const [isOpen, setIsOpen] = useState(false);

  // Load persisted data from localStorage
  const loadPersistedData = (): StoredLeaderboardData | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Error loading persisted leaderboard data:", error);
    }
    return null;
  };

  // Save data to localStorage
  const savePersistedData = (adminElosMap: Map<string, number>) => {
    try {
      const data: StoredLeaderboardData = {
        adminElos: Object.fromEntries(adminElosMap),
        lastUpdate: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Error saving persisted leaderboard data:", error);
    }
  };

  // Check if update is needed based on time
  const shouldUpdate = (): boolean => {
    const persisted = loadPersistedData();
    if (!persisted) return true; // No data, need initial load

    const lastUpdateTime = new Date(persisted.lastUpdate).getTime();
    const now = new Date().getTime();
    const timeSinceUpdate = now - lastUpdateTime;

    // Add 5 minutes random variance (20-25 minutes total)
    const randomVariance = Math.random() * 5 * 60 * 1000;
    return timeSinceUpdate > (UPDATE_INTERVAL + randomVariance);
  };

  useEffect(() => {
    // Load persisted data or fetch new data
    const persisted = loadPersistedData();
    const needsUpdate = shouldUpdate();

    if (persisted && !needsUpdate) {
      // Use persisted data
      const elosMap = new Map(Object.entries(persisted.adminElos));
      setAdminElos(elosMap);
      fetchLeaderboard(false, elosMap);
    } else {
      // Need fresh data
      fetchLeaderboard(true);
    }

    // Set up interval to check for updates every minute
    const checkInterval = setInterval(() => {
      if (shouldUpdate()) {
        fetchLeaderboard(false); // Adjust existing ELOs
      }
    }, 60 * 1000); // Check every minute
    
    return () => clearInterval(checkInterval);
  }, [userId]);

  const generateHighElo = () => {
    // Generate random high ELO between 1800-2500 for admin profiles
    return Math.floor(Math.random() * 700) + 1800;
  };

  const adjustElo = (currentElo: number): number => {
    // Simulate ELO changes: ±5 to ±15 points
    const change = Math.floor(Math.random() * 11) + 5; // 5-15
    const isIncrease = Math.random() > 0.5;
    const newElo = isIncrease ? currentElo + change : currentElo - change;
    
    // Keep ELO in reasonable bounds (1700-2600)
    return Math.max(1700, Math.min(2600, newElo));
  };

  const fetchLeaderboard = async (isInitial: boolean = false, existingElos?: Map<string, number>) => {
    try {
      // Fetch all profiles with ELO
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, tris_elo, is_admin_profile")
        .order("tris_elo", { ascending: false });

      if (error) throw error;

      if (profiles) {
        const newAdminElos = new Map<string, number>();
        const usedElos = new Set<number>();
        
        // First, collect all non-admin ELOs
        profiles.forEach(profile => {
          if (!profile.is_admin_profile) {
            usedElos.add(profile.tris_elo || 1200);
          }
        });
        
        // Use existing ELOs if provided, otherwise use current state
        const currentElosMap = existingElos || adminElos;

        const updatedProfiles = profiles.map(profile => {
          if (profile.is_admin_profile) {
            let newElo: number;
            
            if (isInitial || !currentElosMap.has(profile.id)) {
              // Initial load or new profile: generate completely new ELO
              do {
                newElo = generateHighElo();
              } while (usedElos.has(newElo));
            } else {
              // Subsequent update: adjust existing ELO to simulate games played
              const currentElo = currentElosMap.get(profile.id) || generateHighElo();
              do {
                newElo = adjustElo(currentElo);
              } while (usedElos.has(newElo));
            }
            
            usedElos.add(newElo);
            newAdminElos.set(profile.id, newElo);
            return { ...profile, tris_elo: newElo };
          }
          return profile;
        });

        setAdminElos(newAdminElos);
        
        // Save to localStorage
        savePersistedData(newAdminElos);

        // Sort by ELO after updating admin profiles
        const sortedProfiles = updatedProfiles.sort((a, b) => (b.tris_elo || 1200) - (a.tris_elo || 1200));
        
        // Get top 5
        setTopPlayers(sortedProfiles.slice(0, 5));

        // Find user's rank and ELO
        if (userId) {
          const userProfile = sortedProfiles.find(p => p.id === userId);
          if (userProfile) {
            setUserElo(userProfile.tris_elo || 1200);
            const rank = sortedProfiles.findIndex(p => p.id === userId) + 1;
            setUserRank(rank);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) return "";
    if (avatarPath.startsWith("http")) return avatarPath;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/profile-images/${avatarPath}`;
  };

  const getTrophyIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-500" fill="currentColor" />;
      case 1:
        return <Trophy className="w-5 h-5 text-gray-400" fill="currentColor" />;
      case 2:
        return <Trophy className="w-5 h-5 text-amber-700" fill="currentColor" />;
      case 3:
        return <Medal className="w-5 h-5 text-blue-500" fill="currentColor" />;
      case 4:
        return <Award className="w-5 h-5 text-purple-500" fill="currentColor" />;
      default:
        return null;
    }
  };

  const getRankDisplay = () => {
    if (!userRank) return "N/A";
    if (userRank === 1) return "1° 🥇";
    if (userRank === 2) return "2° 🥈";
    if (userRank === 3) return "3° 🥉";
    return `${userRank}°`;
  };

  return (
    <div className="space-y-4">
      {/* User's ELO and Rank */}
      {userId && (
        <Card className="p-4 bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Il tuo ELO</p>
              <p className="text-3xl font-bold text-primary">{userElo}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Posizione classifica</p>
              <p className="text-2xl font-bold">{getRankDisplay()}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Leaderboard - Collapsible */}
      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
        {/* Header - Clickable */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h4 className="font-bold text-lg">Classifica ELO</h4>
          </div>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-primary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-primary" />
          )}
        </button>

        {/* Collapsible Content */}
        {isOpen && (
          <div className="p-4 pt-0 space-y-3">
            {topPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  player.id === userId
                    ? "bg-primary/20 border-2 border-primary"
                    : "bg-background/50 hover:bg-background/80"
                }`}
              >
                {/* Rank and Trophy */}
                <div className="flex items-center justify-center w-10">
                  {getTrophyIcon(index)}
                </div>

                {/* Avatar */}
                <Avatar className="w-10 h-10 border-2 border-primary/50">
                  <AvatarImage src={getAvatarUrl(player.avatar_url)} />
                  <AvatarFallback>
                    {player.nickname.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {player.nickname}
                    {player.id === userId && (
                      <span className="text-xs text-primary ml-2">(Tu)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    #{index + 1} in classifica
                  </p>
                </div>

                {/* ELO */}
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">ELO</p>
                  <p className="font-bold text-lg text-primary">
                    {player.tris_elo || 1200}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
