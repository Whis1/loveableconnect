import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useBanCheck } from "@/hooks/useBanCheck";
import { ArrowLeft, MapPin, Filter, RotateCcw, Search as SearchIcon, Heart, MessageCircle } from "lucide-react";
import { ProfileGridCard } from "@/components/ProfileGridCard";
import { MatchBanner } from "@/components/MatchBanner";
import { useTextTranslation } from "@/hooks/useTranslation";
import { useLikes } from "@/hooks/useLikes";
import { useProfiles } from "@/hooks/useProfiles";
import { TrisGameBanner } from "@/components/tris/TrisGameBanner";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  birthdate: string | null;
  gender: string | null;
  sexual_orientation: string | null;
  relationship_status: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
  relationship_type: string | null;
  looking_for: string[] | null;
  latitude: number | null;
  longitude: number | null;
  last_active: string | null;
  is_admin_profile: boolean;
  distance?: number;
  translatedBio?: string | null;
  translatedInterests?: string[] | null;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

const Explore = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { translateProfiles } = useTextTranslation();
  useBanCheck(); // Check if user is banned
  const { likedProfileIds, loading: likesLoading } = useLikes();
  const { profiles: cachedProfiles, loading: profilesLoading } = useProfiles();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]); // TUTTI i profili, caricati subito
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showGeoLoader, setShowGeoLoader] = useState(true);
  
  // Pre-caricare matches e hidden matches per performance
  const [matchedProfileIds, setMatchedProfileIds] = useState<Set<string>>(new Set());
  
  // Pre-caricare gli stati online
  const [onlineStatuses, setOnlineStatuses] = useState<Map<string, { isOnline: boolean; showStatus: boolean }>>(new Map());
  
  const [ageRange, setAgeRange] = useState([18, 90]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedOrientations, setSelectedOrientations] = useState<string[]>([]);
  const [matchBanner, setMatchBanner] = useState<{ show: boolean; userName: string; userAvatar: string | null }>({
    show: false,
    userName: "",
    userAvatar: null,
  });
  const ignoreNextRealtimeRef = useRef(false);

  const genderOptions = [
    { value: "male", label: "Uomo" },
    { value: "female", label: "Donna" },
    { value: "transgender", label: "Transgender" },
    { value: "genderfluid", label: "Genderfluid" },
    { value: "non-binary", label: "Non binario" },
  ];

  const orientationOptions = [
    { value: "heterosexual", label: "Eterosessuale" },
    { value: "homosexual", label: "Omosessuale" },
    { value: "bisexual", label: "Bisessuale" },
    { value: "pansexual", label: "Pansessuale" },
  ];

  // Map canonical filter values to synonyms actually present in DB (Italian/English variants)
  const genderSynonymsMap: Record<string, string[]> = {
    "male": ["male", "uomo", "maschio", "man", "m"],
    "female": ["female", "donna", "femmina", "woman", "f"],
    "transgender": ["transgender", "trans"],
    "genderfluid": ["genderfluid", "gender-fluid", "gender fluid"],
    "non-binary": ["non-binary", "non binary", "nonbinary", "non binario", "enby"],
  };

  const orientationSynonymsMap: Record<string, string[]> = {
    "heterosexual": ["heterosexual", "eterosessuale", "etero", "straight"],
    "homosexual": ["homosexual", "omosessuale", "gay", "lesbian", "lesbo"],
    "bisexual": ["bisexual", "bisessuale", "bi"],
    "pansexual": ["pansexual", "pansessuale", "pansexuale", "pan"],
  };

  useEffect(() => {
    const initializeExplore = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if geolocation is enabled and cookie consent is given
      const geolocationEnabled = localStorage.getItem("geolocationEnabled");
      const cookieConsent = localStorage.getItem("geolocationCookieConsent");
      
      if (geolocationEnabled !== "true" || cookieConsent !== "accepted") {
        toast({
          title: "Geolocalizzazione richiesta",
          description: "Attiva la geolocalizzazione e accetta i cookie per accedere all'esplorazione profili",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setCurrentUser(session.user.id);
      
      // Pre-carica matches per performance
      const { data: matchesData } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`);

      const matches = new Set(
        (matchesData || []).map(match => 
          match.user1_id === session.user.id ? match.user2_id : match.user1_id
        )
      );
      setMatchedProfileIds(matches);
      
      // Use cached profiles from useProfiles hook if available
      if (cachedProfiles.length > 0 && !profilesLoading) {
        const filteredProfiles = cachedProfiles
          .filter(p => !matches.has(p.id)) as Profile[];
        setProfiles(filteredProfiles);
        setLoading(false);
      } else {
        // Load profiles only if cache is empty
        await loadAllProfiles(session.user.id, matches);
        setLoading(false);
      }
      
      // Show geolocation loader for 2 seconds (reduced from 5)
      setTimeout(() => {
        setShowGeoLoader(false);
      }, 2000);
    };

    initializeExplore();

    // Realtime subscription for profile updates
    const channel = supabase
      .channel('profile-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        async (payload) => {
          console.log('Profile updated:', payload);
          // Reload the updated profile completely from database
          const { data: updatedProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.id)
            .single();
          
          if (!error && updatedProfile) {
            // Update profile without translation for performance
            const updated = updatedProfile as Profile;
            
            setProfiles(prev => prev.map(p => 
              p.id === updated.id ? updated : p
            ));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'matches'
        },
        async (payload) => {
          // When a match is deleted, the profiles should reappear
          if (currentUser) {
            await loadAllProfiles(currentUser);
          }
        }
      )
      .subscribe();

    // Realtime subscription for new matches - show banner immediately
    const matchChannel = supabase
      .channel('new-matches')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches'
        },
        async (payload) => {
          console.log('🎉 New match detected:', payload);
          const newMatch = payload.new as any;
          
          // Check if this match involves the current user
          if (currentUser && (newMatch.user1_id === currentUser || newMatch.user2_id === currentUser)) {
            const otherUserId = newMatch.user1_id === currentUser ? newMatch.user2_id : newMatch.user1_id;
            
            if (ignoreNextRealtimeRef.current) {
              console.log('⚠️ Ignoring realtime match banner due to immediate onMatch');
              ignoreNextRealtimeRef.current = false;
              return;
            }

            // Fetch the other user's profile to show their name and avatar
            const { data: otherUserProfile } = await supabase
              .from('profiles')
              .select('nickname, full_name, avatar_url')
              .eq('id', otherUserId)
              .single();
            
            if (otherUserProfile) {
              const userName = otherUserProfile.nickname || otherUserProfile.full_name;
              let userAvatar: string | null = null;
              if (otherUserProfile.avatar_url) {
                userAvatar = /^https?:\/\//.test(otherUserProfile.avatar_url)
                  ? otherUserProfile.avatar_url
                  : supabase.storage.from('profile-images').getPublicUrl(otherUserProfile.avatar_url).data.publicUrl;
              }
              console.log('🎉 Showing match banner for (realtime):', userName);
              handleMatch(userName, userAvatar);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(matchChannel);
    };
  }, [navigate, currentUser, cachedProfiles.length, profilesLoading]);

  const loadAllProfiles = async (userId: string, preloadedMatches?: Set<string>) => {
    setLoading(true);
    
    try {
      // Use preloaded matches se disponibili
      let matchedUserIds: Set<string>;
      if (preloadedMatches) {
        matchedUserIds = preloadedMatches;
      } else {
        const { data: matchesData } = await supabase
          .from("matches")
          .select("user1_id, user2_id")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        matchedUserIds = new Set(
          (matchesData || []).map(match => 
            match.user1_id === userId ? match.user2_id : match.user1_id
          )
        );
        setMatchedProfileIds(matchedUserIds);
      }

      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", userId);

      if (error) throw error;

      // Filter out profiles with existing matches
      let allProfiles: Profile[] = (profilesData || [])
        .filter(profile => !matchedUserIds.has(profile.id)) as Profile[];
      
      // Fetch subscription types via RPC (bypasses RLS safely)
      const profileIds = allProfiles.map(p => p.id);
      const { data: subsData } = await supabase.rpc('get_subscription_types', { profile_ids: profileIds });
      const creditsMap = new Map<string, string>((subsData || []).map((c: any) => [c.user_id, c.subscription_type]));
      
      // Sort profiles: monthly subscribers first, then admin profiles, then by last_active
      allProfiles.sort((a, b) => {
        const aSub = creditsMap.get(a.id);
        const bSub = creditsMap.get(b.id);
        
        const rank = (p: Profile, sub?: string) => {
          if (sub === 'monthly') return 0; // monthly subscribers first
          if (p.is_admin_profile === true) return 1; // then admin profiles
          return 2; // then everyone else (standard + weekly)
        };
        
        const rA = rank(a, aSub);
        const rB = rank(b, bSub);
        if (rA !== rB) return rA - rB;
        
        // Then sort by last active
        const dateA = a.last_active ? new Date(a.last_active).getTime() : 0;
        const dateB = b.last_active ? new Date(b.last_active).getTime() : 0;
        return dateB - dateA;
      });

      // CARICA TUTTI i profili subito, no paginazione
      setProfiles(allProfiles);
      
      // Pre-carica gli stati online di tutti i profili
      await loadOnlineStatuses(allProfiles.map(p => p.id));
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOnlineStatuses = async (profileIds: string[]) => {
    if (profileIds.length === 0) return;

    try {
      // Fetch all profiles with online status data
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, show_online_status, is_admin_profile, last_active, manual_online_status')
        .in('id', profileIds);

      if (!profilesData) return;

      const statusMap = new Map<string, { isOnline: boolean; showStatus: boolean }>();
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

      profilesData.forEach(profile => {
        // Check manual_online_status first
        if (profile.manual_online_status !== null) {
          statusMap.set(profile.id, {
            isOnline: profile.manual_online_status,
            showStatus: profile.show_online_status ?? true,
          });
          return;
        }

        // Admin profiles are always online
        if (profile.is_admin_profile) {
          statusMap.set(profile.id, {
            isOnline: true,
            showStatus: true,
          });
          return;
        }

        // Check last_active
        const lastActive = profile.last_active ? new Date(profile.last_active) : null;
        const isOnline = lastActive ? lastActive > twoMinutesAgo : false;

        statusMap.set(profile.id, {
          isOnline,
          showStatus: profile.show_online_status ?? true,
        });
      });

      setOnlineStatuses(statusMap);
    } catch (error) {
      console.error('Error loading online statuses:', error);
    }
  };

  // RIMOSSO: loadMoreProfiles - ora carichi tutto subito

  const applyFilters = async () => {
    if (!currentUser) return;

    setLoading(true);
    setShowFilters(false);

    try {
      // Get user's matches to exclude them
      const { data: matchesData } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${currentUser},user2_id.eq.${currentUser}`);

      const matchedUserIds = new Set(
        (matchesData || []).map(match => 
          match.user1_id === currentUser ? match.user2_id : match.user1_id
        )
      );

      // Fetch all profiles excluding current user
      let query = supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUser);

      // Age filter
      query = query.gte("age", ageRange[0]).lte("age", ageRange[1]);

      // Gender filter with synonyms
      if (selectedGenders.length > 0) {
        const genderValues = Array.from(new Set(selectedGenders.flatMap(g => genderSynonymsMap[g] || [g])));
        query = query.in("gender", genderValues);
      }

      // Orientation filter with synonyms
      if (selectedOrientations.length > 0) {
        const orientationValues = Array.from(new Set(selectedOrientations.flatMap(o => orientationSynonymsMap[o] || [o])));
        query = query.in("sexual_orientation", orientationValues);
      }

      const { data: profilesData, error } = await query;

      if (error) throw error;

      // Filter out profiles with existing matches
      let filteredProfiles: Profile[] = (profilesData || [])
        .filter(profile => !matchedUserIds.has(profile.id)) as Profile[];

      // Fetch subscription types via RPC (bypasses RLS safely)
      const profileIds = filteredProfiles.map(p => p.id);
      const { data: subsData } = await supabase.rpc('get_subscription_types', { profile_ids: profileIds });
      const creditsMap = new Map<string, string>((subsData || []).map((c: any) => [c.user_id, c.subscription_type]));
      
      // Sort profiles: monthly subscribers first, then admin profiles, then by last_active
      filteredProfiles.sort((a, b) => {
        const aSub = creditsMap.get(a.id);
        const bSub = creditsMap.get(b.id);
        
        const rank = (p: Profile, sub?: string) => {
          if (sub === 'monthly') return 0; // monthly subscribers first
          if (p.is_admin_profile === true) return 1; // then admin profiles
          return 2; // then everyone else (standard + weekly)
        };
        
        const rA = rank(a, aSub);
        const rB = rank(b, bSub);
        if (rA !== rB) return rA - rB;
        
        // Then sort by last active
        const dateA = a.last_active ? new Date(a.last_active).getTime() : 0;
        const dateB = b.last_active ? new Date(b.last_active).getTime() : 0;
        return dateB - dateA;
      });

      // CARICA TUTTI i profili filtrati subito
      setProfiles(filteredProfiles);
      
      // Pre-carica gli stati online dei profili filtrati
      await loadOnlineStatuses(filteredProfiles.map(p => p.id));
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setAgeRange([18, 90]);
    setSelectedGenders([]);
    setSelectedOrientations([]);
    if (currentUser) {
      loadAllProfiles(currentUser);
    }
  };

  const toggleGender = (gender: string) => {
    setSelectedGenders(prev => 
      prev.includes(gender) 
        ? prev.filter(g => g !== gender)
        : [...prev, gender]
    );
  };

  const toggleOrientation = (orientation: string) => {
    setSelectedOrientations(prev => 
      prev.includes(orientation) 
        ? prev.filter(o => o !== orientation)
        : [...prev, orientation]
    );
  };

  const handleProfileLike = (profileId: string) => {
    // This is just for UI responsiveness - the profile list will refresh on next load
    // Don't remove from displayed profiles to avoid the disappearing bug
  };

  const handleMatch = (userName: string, userAvatar: string | null = null) => {
    console.log('🎉 MATCH! Showing banner for:', userName);
    setMatchBanner({ show: true, userName, userAvatar });
  };

  if (loading || likesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("explore.loading")}</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen relative bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-2 md:p-4">
      {/* Geolocation Loader */}
      {showGeoLoader && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center animate-fade-in">
          <div className="text-center space-y-6">
            {/* Spinning Circle */}
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-pink-200 dark:border-pink-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 border-r-purple-500 animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-purple-500 border-r-indigo-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
              <MapPin className="absolute inset-0 m-auto h-8 w-8 text-pink-500 animate-pulse" />
            </div>
            
            {/* Text */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent animate-pulse">
                Geolocalizzando profili
              </h2>
              <p className="text-lg text-muted-foreground animate-pulse">
                nelle tue vicinanze...
              </p>
            </div>
            
            {/* Decorative dots */}
            <div className="flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
      
      {matchBanner.show && (
        <MatchBanner
          matchedUserName={matchBanner.userName}
          matchedUserAvatar={matchBanner.userAvatar}
          onClose={() => setMatchBanner({ show: false, userName: "", userAvatar: null })}
        />
      )}
      
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-15 dark:opacity-25" 
        style={{
          backgroundImage: 'url(/images/love-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {!showGeoLoader && (
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="mb-3 md:mb-4 flex justify-between items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/")} size="sm">
              <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t("explore.back")}</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              size="sm"
            >
              <Filter className="h-4 w-4 md:mr-2" />
              <span className="hidden sm:inline">{t("explore.filters")}</span>
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mb-6 shadow-2xl border-0 bg-gradient-to-br from-white/95 via-pink-50/90 to-purple-50/90 dark:from-gray-800/95 dark:via-purple-900/80 dark:to-indigo-900/80 backdrop-blur-sm animate-fade-in">
              <CardContent className="pt-6 space-y-8">
                {/* Age Filter */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="text-base font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        {t("explore.ageTitle")}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {ageRange[0]} - {ageRange[1]} {t("explore.yearsOld")}
                      </p>
                    </div>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={ageRange}
                      onValueChange={setAgeRange}
                      min={18}
                      max={90}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Gender Filter */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 text-white shadow-lg">
                      <Heart className="h-4 w-4" />
                    </div>
                    <Label className="text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      {t("explore.genderTitle")}
                    </Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {genderOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => toggleGender(option.value)}
                        className={`
                          px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 transform hover:scale-105 shadow-md
                          ${selectedGenders.includes(option.value)
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/50 ring-2 ring-pink-300 dark:ring-pink-700'
                            : 'bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-pink-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sexual Orientation Filter */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-lg">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <Label className="text-base font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                      {t("explore.orientationTitle")}
                    </Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {orientationOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => toggleOrientation(option.value)}
                        className={`
                          px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-300 transform hover:scale-105 shadow-md
                          ${selectedOrientations.includes(option.value)
                            ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/50 ring-2 ring-indigo-300 dark:ring-indigo-700'
                            : 'bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                          }
                        `}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
                  <Button 
                    onClick={applyFilters} 
                    className="flex-1 h-12 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 hover:from-pink-600 hover:via-rose-600 hover:to-purple-600 text-white font-bold shadow-xl shadow-pink-500/50 transition-all duration-300 transform hover:scale-[1.02]" 
                    size="lg" 
                    disabled={loading}
                  >
                    <SearchIcon className="h-5 w-5 mr-2" />
                    {t("explore.searchButton")}
                  </Button>
                  <Button 
                    onClick={resetFilters} 
                    variant="outline" 
                    size="lg"
                    className="px-6 h-12 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    {t("explore.resetFilters")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tris Game Banner */}
          <TrisGameBanner />

          {/* Results Grid - TUTTI I PROFILI CARICATI SUBITO */}
          {profiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
              {profiles.map((profile) => (
                <ProfileGridCard
                  key={profile.id}
                  profile={profile}
                  currentUserId={currentUser!}
                  likedProfileIds={likedProfileIds}
                  hasActiveMatch={matchedProfileIds.has(profile.id)}
                  onlineStatus={onlineStatuses.get(profile.id)}
                  onLike={handleProfileLike}
                  onMatch={(name, avatar) => { ignoreNextRealtimeRef.current = true; handleMatch(name, avatar); }}
                />
              ))}
            </div>
          ) : (
            !loading && (
              <Card className="text-center p-6 md:p-12">
                <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">{t("explore.startSearchTitle")}</h2>
                <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                  {t("explore.startSearchDescription")}
                </p>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Explore;