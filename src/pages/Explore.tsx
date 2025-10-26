import { useEffect, useState, useCallback } from "react";
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
import { ArrowLeft, MapPin, Filter, RotateCcw, Search as SearchIcon } from "lucide-react";
import { ProfileGridCard } from "@/components/ProfileGridCard";
import { MatchBanner } from "@/components/MatchBanner";
import { useTextTranslation } from "@/hooks/useTranslation";
import { useLikes } from "@/hooks/useLikes";
import { useProfiles } from "@/hooks/useProfiles";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [displayedProfiles, setDisplayedProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [ageRange, setAgeRange] = useState([18, 90]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedOrientations, setSelectedOrientations] = useState<string[]>([]);
  const [matchBanner, setMatchBanner] = useState<{ show: boolean; userName: string }>({
    show: false,
    userName: "",
  });
  
  const PROFILES_PER_PAGE = 24;

  const genderOptions = [
    { value: "male", label: "Uomo" },
    { value: "female", label: "Donna" },
    { value: "transgender", label: "Transgender" },
    { value: "transexual", label: "Transessuale" },
    { value: "genderfluid", label: "Genderfluid" },
    { value: "non-binary", label: "Non binario" },
  ];

  const orientationOptions = [
    { value: "heterosexual", label: "Eterosessuale" },
    { value: "homosexual", label: "Omosessuale" },
    { value: "bisexual", label: "Bisessuale" },
    { value: "pansexual", label: "Pansessuale" },
    { value: "asexual", label: "Asessuale" },
  ];

  // Map canonical filter values to synonyms actually present in DB (Italian/English variants)
  const genderSynonymsMap: Record<string, string[]> = {
    "male": ["male", "uomo", "maschio", "man", "m"],
    "female": ["female", "donna", "femmina", "woman", "f"],
    "transgender": ["transgender", "trans"],
    "transexual": ["transexual", "transessuale", "transsexual", "transex"],
    "genderfluid": ["genderfluid", "gender-fluid", "gender fluid"],
    "non-binary": ["non-binary", "non binary", "nonbinary", "non binario", "enby"],
  };

  const orientationSynonymsMap: Record<string, string[]> = {
    "heterosexual": ["heterosexual", "eterosessuale", "etero", "straight"],
    "homosexual": ["homosexual", "omosessuale", "gay", "lesbian", "lesbo"],
    "bisexual": ["bisexual", "bisessuale", "bi"],
    "pansexual": ["pansexual", "pansessuale", "pansexuale", "pan"],
    "asexual": ["asexual", "asessuale", "ace"],
  };

  useEffect(() => {
    const initializeExplore = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setCurrentUser(session.user.id);
      
      // Load all profiles automatically
      await loadAllProfiles(session.user.id);
      
      setLoading(false);
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
            setDisplayedProfiles(prev => prev.map(p => 
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const loadAllProfiles = async (userId: string) => {
    setLoading(true);
    
    try {
      // Get user's matches to exclude them
      const { data: matchesData } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      const matchedUserIds = new Set(
        (matchesData || []).map(match => 
          match.user1_id === userId ? match.user2_id : match.user1_id
        )
      );

      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", userId);

      if (error) throw error;

      // Filter out profiles with existing matches
      let allProfiles: Profile[] = (profilesData || [])
        .filter(profile => !matchedUserIds.has(profile.id)) as Profile[];
      
      // Sort by last active
      allProfiles.sort((a, b) => {
        const dateA = a.last_active ? new Date(a.last_active).getTime() : 0;
        const dateB = b.last_active ? new Date(b.last_active).getTime() : 0;
        return dateB - dateA;
      });

      // Don't translate all profiles upfront - translate on demand for better performance
      setProfiles(allProfiles);
      setDisplayedProfiles([]);
      setPage(1);
      setHasMore(true);
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

  const loadMoreProfiles = useCallback(() => {
    const startIdx = (page - 1) * PROFILES_PER_PAGE;
    const endIdx = startIdx + PROFILES_PER_PAGE;
    const newProfiles = profiles.slice(startIdx, endIdx);
    
    if (newProfiles.length === 0) {
      setHasMore(false);
      return;
    }
    
    setDisplayedProfiles(prev => [...prev, ...newProfiles]);
    setPage(prev => prev + 1);
  }, [page, profiles]);

  useEffect(() => {
    if (profiles.length > 0 && displayedProfiles.length === 0) {
      loadMoreProfiles();
    }
  }, [profiles, displayedProfiles, loadMoreProfiles]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 100
        && hasMore
        && !loading
      ) {
        loadMoreProfiles();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, loadMoreProfiles]);

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

      // Sort by last active
      filteredProfiles.sort((a, b) => {
        const dateA = a.last_active ? new Date(a.last_active).getTime() : 0;
        const dateB = b.last_active ? new Date(b.last_active).getTime() : 0;
        return dateB - dateA;
      });

      // Don't translate all profiles upfront - translate on demand for better performance
      setProfiles(filteredProfiles);
      setDisplayedProfiles([]);
      setPage(1);
      setHasMore(true);
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

  const handleMatch = (userName: string) => {
    setMatchBanner({ show: true, userName });
  };

  if (loading || likesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("explore.loading")}</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen relative bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
      {matchBanner.show && (
        <MatchBanner
          matchedUserName={matchBanner.userName}
          onClose={() => setMatchBanner({ show: false, userName: "" })}
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
      
      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="mb-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("explore.back")}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {t("explore.filters")}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6 shadow-lg">
            <CardContent className="pt-6 space-y-6">
              {/* Age Filter */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">{t("explore.ageTitle")}: {ageRange[0]} - {ageRange[1]} {t("explore.yearsOld")}</Label>
                <Slider
                  value={ageRange}
                  onValueChange={setAgeRange}
                  min={18}
                  max={90}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Gender Filter */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">{t("explore.genderTitle")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {genderOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.value}
                        checked={selectedGenders.includes(option.value)}
                        onCheckedChange={() => toggleGender(option.value)}
                      />
                      <label
                        htmlFor={option.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sexual Orientation Filter */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">{t("explore.orientationTitle")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {orientationOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`orientation-${option.value}`}
                        checked={selectedOrientations.includes(option.value)}
                        onCheckedChange={() => toggleOrientation(option.value)}
                      />
                      <label
                        htmlFor={`orientation-${option.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={applyFilters} className="flex-1" size="lg" disabled={loading}>
                  <SearchIcon className="h-4 w-4 mr-2" />
                  {t("explore.searchButton")}
                </Button>
                <Button onClick={resetFilters} variant="outline" size="lg">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("explore.resetFilters")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Grid */}
        {displayedProfiles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
              {displayedProfiles.map((profile) => (
                <ProfileGridCard
                  key={profile.id}
                  profile={profile}
                  currentUserId={currentUser!}
                  likedProfileIds={likedProfileIds}
                  onLike={handleProfileLike}
                  onMatch={handleMatch}
                />
              ))}
            </div>

            {loading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t("explore.loading")}</p>
              </div>
            )}

            {!hasMore && displayedProfiles.length > 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t("explore.noMoreToShow")}</p>
                <Button 
                  onClick={() => navigate("/")} 
                  variant="outline" 
                  className="mt-4"
                >
                  {t("explore.backToDashboard")}
                </Button>
              </div>
            )}
          </>
        ) : (
          !loading && (
            <Card className="text-center p-12">
              <h2 className="text-2xl font-bold mb-4">{t("explore.startSearchTitle")}</h2>
              <p className="text-muted-foreground mb-6">
                {t("explore.startSearchDescription")}
              </p>
            </Card>
          )
        )}
      </div>
    </div>
  );
};

export default Explore;