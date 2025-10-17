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
import { ArrowLeft, MapPin, Filter, RotateCcw, Search as SearchIcon } from "lucide-react";
import { ProfileGridCard } from "@/components/ProfileGridCard";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  gender: string | null;
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
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

const Explore = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [displayedProfiles, setDisplayedProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [ageRange, setAgeRange] = useState([18, 90]);
  const [distanceRange, setDistanceRange] = useState([100]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  
  const PROFILES_PER_PAGE = 24;

  const genderOptions = [
    { value: "male", label: t("explore.genders.male") },
    { value: "female", label: t("explore.genders.female") },
    { value: "transexual", label: t("explore.genders.transexual") },
    { value: "transgender", label: t("explore.genders.transgender") },
    { value: "homosexual", label: t("explore.genders.homosexual") },
    { value: "non-binary", label: t("explore.genders.nonBinary") },
  ];

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
  }, [navigate]);

  const loadAllProfiles = async (userId: string) => {
    setLoading(true);
    
    try {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", userId)
        .neq("is_admin_profile", true);

      if (error) throw error;

      let allProfiles: Profile[] = (profilesData || []) as Profile[];
      
      // Sort by last active
      allProfiles.sort((a, b) => {
        const dateA = a.last_active ? new Date(a.last_active).getTime() : 0;
        const dateB = b.last_active ? new Date(b.last_active).getTime() : 0;
        return dateB - dateA;
      });

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

  const requestLocationPermission = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(location);
          setLocationPermission(true);
          toast({
            title: t("explore.geolocation.acquired"),
            description: t("explore.geolocation.acquiredDescription"),
          });
          
          if (currentUser) {
            supabase
              .from("profiles")
              .update({
                latitude: location.latitude,
                longitude: location.longitude,
              })
              .eq("id", currentUser)
              .then(() => console.log("Location saved"));
          }
        },
        (error) => {
          toast({
            title: t("explore.geolocation.error"),
            description: t("explore.geolocation.errorDescription"),
            variant: "destructive",
          });
          console.error("Geolocation error:", error);
        }
      );
    } else {
      toast({
        title: t("explore.geolocation.notSupported"),
        description: t("explore.geolocation.notSupportedDescription"),
        variant: "destructive",
      });
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const applyFilters = async () => {
    if (!currentUser) return;

    setLoading(true);
    setShowFilters(false);

    try {
      // Fetch all profiles excluding current user
      let query = supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUser)
        .neq("is_admin_profile", true);

      // Age filter
      query = query.gte("age", ageRange[0]).lte("age", ageRange[1]);

      // Gender filter
      if (selectedGenders.length > 0) {
        query = query.in("gender", selectedGenders);
      }

      const { data: profilesData, error } = await query;

      if (error) throw error;

      let filteredProfiles: Profile[] = (profilesData || []) as Profile[];

      // Distance filter if location is available
      if (userLocation && locationPermission) {
        filteredProfiles = filteredProfiles
          .map(profile => {
            if (profile.latitude && profile.longitude) {
              const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                profile.latitude,
                profile.longitude
              );
              return { ...profile, distance: Math.round(distance) } as Profile;
            }
            return profile;
          })
          .filter(profile => {
            if (profile.distance !== undefined) {
              return profile.distance <= distanceRange[0];
            }
            return false;
          });

        filteredProfiles.sort((a, b) => (a.distance || 999999) - (b.distance || 999999));
      } else {
        filteredProfiles.sort((a, b) => {
          const dateA = a.last_active ? new Date(a.last_active).getTime() : 0;
          const dateB = b.last_active ? new Date(b.last_active).getTime() : 0;
          return dateB - dateA;
        });
      }

      setProfiles(filteredProfiles);
      setDisplayedProfiles([]);
      setPage(1);
      setHasMore(true);
      
      toast({
        title: "Ricerca completata",
        description: `Trovati ${filteredProfiles.length} profili`,
      });
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
    setDistanceRange([100]);
    setSelectedGenders([]);
    setProfiles([]);
    setDisplayedProfiles([]);
    setPage(1);
    setHasMore(true);
  };

  const toggleGender = (gender: string) => {
    setSelectedGenders(prev => 
      prev.includes(gender) 
        ? prev.filter(g => g !== gender)
        : [...prev, gender]
    );
  };

  const handleProfileLike = () => {
    // Remove the liked profile from displayed profiles
    setDisplayedProfiles(prev => prev.filter(p => p.id !== profiles[0]?.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("explore.loading")}</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen relative bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
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
      
      <div className="container mx-auto max-w-2xl relative z-10">
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
          <Card className="mb-6">
            <CardContent className="pt-6 space-y-6">
              {/* Location Request */}
              {!locationPermission && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Attiva la posizione
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        Consenti l'accesso alla posizione per trovare persone vicine a te
                      </p>
                      <Button onClick={requestLocationPermission} size="sm" variant="default">
                        Attiva posizione
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {locationPermission && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Posizione attiva
                  </p>
                </div>
              )}

              {/* Age Filter */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Età: {ageRange[0]} - {ageRange[1]} anni</Label>
                <Slider
                  value={ageRange}
                  onValueChange={setAgeRange}
                  min={18}
                  max={90}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Distance Filter */}
              {locationPermission && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Distanza: fino a {distanceRange[0]} km</Label>
                  <Slider
                    value={distanceRange}
                    onValueChange={setDistanceRange}
                    min={1}
                    max={500}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}

              {/* Gender Filter */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Genere</Label>
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

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={applyFilters} className="flex-1" size="lg" disabled={loading}>
                  <SearchIcon className="h-4 w-4 mr-2" />
                  Cerca
                </Button>
                <Button onClick={resetFilters} variant="outline" size="lg">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Grid */}
        {displayedProfiles.length > 0 ? (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {profiles.length} profili trovati
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-6">
              {displayedProfiles.map((profile) => (
                <ProfileGridCard
                  key={profile.id}
                  profile={profile}
                  currentUserId={currentUser!}
                  onLike={handleProfileLike}
                />
              ))}
            </div>

            {loading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Caricamento...</p>
              </div>
            )}

            {!hasMore && displayedProfiles.length > 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nessun altro profilo da mostrare</p>
                <Button 
                  onClick={() => navigate("/")} 
                  variant="outline" 
                  className="mt-4"
                >
                  Torna alla Dashboard
                </Button>
              </div>
            )}
          </>
        ) : (
          !loading && (
            <Card className="text-center p-12">
              <h2 className="text-2xl font-bold mb-4">Inizia la tua ricerca</h2>
              <p className="text-muted-foreground mb-6">
                Imposta i filtri e clicca su "Cerca" per trovare persone vicine a te
              </p>
            </Card>
          )
        )}
      </div>
    </div>
  );
};

export default Explore;