import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, ChevronDown, ChevronUp } from "lucide-react";

interface LeaderboardProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  game_elo: number;
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
  const [isLoading, setIsLoading] = useState(false);

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
    if (isLoading) return; // Prevent multiple simultaneous calls
    
    // Load persisted data or fetch new data
    const persisted = loadPersistedData();
    const needsUpdate = shouldUpdate();

    if (persisted && !needsUpdate) {
      // Use persisted data WITHOUT modifications
      const elosMap = new Map(Object.entries(persisted.adminElos));
      setAdminElos(elosMap);
      // Build leaderboard directly from persisted data
      buildLeaderboardFromExistingElos(elosMap);
    } else {
      // Time to update: adjust ELOs or generate new ones
      fetchLeaderboard(!persisted); // true if no persisted data (initial), false if updating
    }

    // Periodic updates disabled to prevent UI stalls
    // We will refresh ELOs only on mount or when userId changes
  }, [userId]);

  const generateHighElo = () => {
    // Generate random high ELO between 1800-2500 for admin profiles, rounded to nearest 10
    const elo = Math.floor(Math.random() * 700) + 1800;
    return Math.round(elo / 10) * 10;
  };

  const adjustElo = (currentElo: number): number => {
    // Simulate ELO changes: ±10 to ±30 points (multiples of 10)
    const change = (Math.floor(Math.random() * 3) + 1) * 10; // 10, 20, or 30
    const isIncrease = Math.random() > 0.5;
    const newElo = isIncrease ? currentElo + change : currentElo - change;
    
    // Keep ELO in reasonable bounds (1700-2600) and ensure it's a multiple of 10
    const boundedElo = Math.max(1700, Math.min(2600, newElo));
    return Math.round(boundedElo / 10) * 10;
  };

  // Compute user's ELO and global rank efficiently (no heavy client sorting)
  const computeUserEloAndRank = async () => {
    try {
      if (!userId) return;
      // Fetch user's ELO
      const { data: userProfile, error: userErr } = await supabase
        .from('profiles')
        .select('game_elo')
        .eq('id', userId)
        .maybeSingle();
      if (userErr) throw userErr;
      const elo = userProfile?.game_elo ?? 1200;
      setUserElo(elo);
      // Count how many users have strictly higher ELO to compute rank
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gt('game_elo', elo);
      const higher = count ?? 0;
      setUserRank(higher + 1);
    } catch (e) {
      console.error('Error computing user rank:', e);
      // Fallback if something goes wrong
      setUserRank(null);
    }
  };

  // Build leaderboard from existing ELOs without fetching or modifying
  const buildLeaderboardFromExistingElos = async (elosMap: Map<string, number>) => {
    setIsLoading(true);
    
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, game_elo, is_admin_profile")
        .order("game_elo", { ascending: false })
        .limit(5);

      if (error) throw error;

      if (profiles) {
        // Use persisted ELOs for admin profiles, real ELOs for users
        const updatedProfiles = profiles.map(profile => {
          if (profile.is_admin_profile && elosMap.has(profile.id)) {
            return { ...profile, game_elo: elosMap.get(profile.id)! };
          }
          return profile;
        });

        // Sort by ELO
        const sortedProfiles = updatedProfiles.sort((a, b) => (b.game_elo || 1200) - (a.game_elo || 1200));
        
        // Get top 5
        setTopPlayers(sortedProfiles.slice(0, 5));

        // Compute user's rank via count, independent of top 5
        if (userId) {
          await computeUserEloAndRank();
        }
      }
    } catch (error) {
      console.error("Error building leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaderboard = async (isInitial: boolean = false) => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      // Fetch all profiles with ELO
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, game_elo, is_admin_profile")
        .order("game_elo", { ascending: false })
        .limit(5);

      if (error) throw error;

      if (profiles) {
        const newAdminElos = new Map<string, number>();
        const usedElos = new Set<number>();
        
        // First, collect all non-admin ELOs
        profiles.forEach(profile => {
          if (!profile.is_admin_profile) {
            usedElos.add(profile.game_elo || 1200);
          }
        });
        
        // Use current adminElos state for subsequent updates
        const currentElosMap = adminElos;

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
            return { ...profile, game_elo: newElo };
          }
          return profile;
        });

        setAdminElos(newAdminElos);
        
        // Save to localStorage
        savePersistedData(newAdminElos);

        // Sort by ELO after updating admin profiles
        const sortedProfiles = updatedProfiles.sort((a, b) => (b.game_elo || 1200) - (a.game_elo || 1200));
        
        // Get top 5
        setTopPlayers(sortedProfiles.slice(0, 5));

        // Compute user's rank via count, independent of top 5
        if (userId) {
          await computeUserEloAndRank();
        }
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setIsLoading(false);
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
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-full blur-sm opacity-75 animate-pulse" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-yellow-300">
              🏆
            </div>
          </div>
        );
      case 1:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 rounded-full blur-sm opacity-60" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-500 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-gray-300">
              🥈
            </div>
          </div>
        );
      case 2:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-600 to-orange-700 rounded-full blur-sm opacity-60" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-orange-300 via-amber-500 to-orange-600 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-orange-400">
              🥉
            </div>
          </div>
        );
      case 3:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 rounded-full blur-sm opacity-50" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-blue-300 via-blue-400 to-blue-600 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-blue-300">
              🎖️
            </div>
          </div>
        );
      case 4:
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-full blur-sm opacity-50" />
            <div className="relative w-10 h-10 bg-gradient-to-br from-purple-300 via-purple-400 to-purple-600 rounded-full flex items-center justify-center text-xl shadow-lg border-2 border-purple-300">
              🏅
            </div>
          </div>
        );
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
            <h4 className="font-bold text-lg">Classifica ELO - TOP 5</h4>
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
                    {player.game_elo || 1200}
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
