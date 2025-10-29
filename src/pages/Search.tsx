import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Search as SearchIcon, RotateCcw, Heart, MessageCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { getGenericLocationPhrase } from "@/lib/utils";

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  bio: string | null;
  age: number | null;
  birthdate: string | null;
  gender: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
  relationship_type: string | null;
  looking_for: string[] | null;
  sexual_orientation: string | null;
  latitude: number | null;
  longitude: number | null;
  last_active: string | null;
  distance?: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

const Search = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsPerPage = 20;

  // Filtri
  const [ageRange, setAgeRange] = useState([18, 90]);
  const [distanceRange, setDistanceRange] = useState([100]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [selectedOrientations, setSelectedOrientations] = useState<string[]>([]);

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
    { value: "pansexual", label: "Pansexuale" },
    { value: "asexual", label: "Asessuale" },
  ];

  useEffect(() => {
    const initializeSearch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setCurrentUser(session.user.id);
      setLoading(false);
    };

    initializeSearch();

    // Realtime subscription for profile updates
    const channel = supabase
      .channel('profile-updates-search')
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
            setProfiles(prev => prev.map(p => 
              p.id === updatedProfile.id ? updatedProfile as Profile : p
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

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
            title: t('search.locationAcquired'),
            description: t('search.locationSuccess'),
          });
          
          // Salva la posizione nel profilo dell'utente
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
            title: t('search.locationError'),
            description: t('search.locationErrorDescription'),
            variant: "destructive",
          });
          console.error("Geolocation error:", error);
        }
      );
    } else {
      toast({
        title: t('search.locationNotSupported'),
        description: t('search.locationNotSupportedDescription'),
        variant: "destructive",
      });
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Raggio della Terra in km
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

      // Fetch tutti i profili escludendo l'utente corrente
      let query = supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUser);

      // Filtro età
      query = query.gte("age", ageRange[0]).lte("age", ageRange[1]);

      // Filtro genere
      if (selectedGenders.length > 0) {
        query = query.in("gender", selectedGenders);
      }

      // Filtro orientamento sessuale
      if (selectedOrientations.length > 0) {
        query = query.in("sexual_orientation", selectedOrientations);
      }

      const { data: profilesData, error } = await query;

      if (error) throw error;

      // Filter out profiles with existing matches
      let filteredProfiles: Profile[] = (profilesData || [])
        .filter(profile => !matchedUserIds.has(profile.id)) as Profile[];

      // Calcola distanza se la posizione è disponibile
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
            if ((profile as any).distance !== undefined) {
              return (profile as any).distance <= distanceRange[0];
            }
            return false; // Escludi profili senza posizione se il filtro distanza è attivo
          });

        // Ordina per distanza
        if (userLocation && locationPermission) {
          filteredProfiles.sort((a, b) => ((a as any).distance || 999999) - ((b as any).distance || 999999));
        }
      } else {
        // Se la posizione non è attiva, ordina per ultima attività
        filteredProfiles.sort((a, b) => {
          const dateA = a.last_active ? new Date(a.last_active).getTime() : 0;
          const dateB = b.last_active ? new Date(b.last_active).getTime() : 0;
          return dateB - dateA;
        });
      }

      setProfiles(filteredProfiles);
      setCurrentPage(1);
      
      toast({
        title: t('search.searchCompleted'),
        description: `${t('search.profilesFound')} ${filteredProfiles.length} ${t('search.profiles')}`,
      });
    } catch (error: any) {
      toast({
        title: t('search.error'),
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
    setSelectedOrientations([]);
    setProfiles([]);
    setCurrentPage(1);
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

  // Paginazione
  const totalPages = Math.ceil(profiles.length / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const currentProfiles = profiles.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('search.loading')}</p>
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
      
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="mb-6 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('search.back')}
          </Button>
          <h1 className="text-2xl font-bold">{t('search.title')}</h1>
        </div>

        {/* Pannello Filtri */}
        <Card className="mb-6">
          <CardContent className="pt-6 space-y-6">
            {/* Richiesta Posizione */}
            {!locationPermission && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      {t('search.locationRequest')}
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      {t('search.locationDescription')}
                    </p>
                    <Button onClick={requestLocationPermission} size="sm" variant="default">
                      {t('search.enableLocation')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {locationPermission && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('search.locationActive')}
                </p>
              </div>
            )}

            {/* Filtro Età */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('search.ageFilter')}: {ageRange[0]} - {ageRange[1]} {t('search.years')}</Label>
              <Slider
                value={ageRange}
                onValueChange={setAgeRange}
                min={18}
                max={90}
                step={1}
                className="w-full"
              />
            </div>

            {/* Filtro Distanza (solo se posizione attiva) */}
            {locationPermission && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">{t('search.distanceFilter')}: {distanceRange[0]} {t('search.km')}</Label>
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

            {/* Filtro Genere */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('common.gender')}</Label>
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

            {/* Filtro Orientamento Sessuale */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('common.orientation')}</Label>
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

            {/* Pulsanti Azione */}
            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={applyFilters} className="flex-1" size="lg">
                <SearchIcon className="h-4 w-4 mr-2" />
                {t('search.applyFilters')}
              </Button>
              <Button onClick={resetFilters} variant="outline" size="lg">
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('search.reset')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Risultati */}
        {profiles.length > 0 && (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                {profiles.length} {t('search.resultsFound')} {currentPage > 1 && `- ${t('search.page')} ${currentPage} ${t('search.of')} ${totalPages}`}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {currentProfiles.map((profile) => (
                <Card key={profile.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-gradient-to-br from-pink-200 to-purple-200 dark:from-pink-900 dark:to-purple-900 flex items-center justify-center">
                    {profile.avatar_url ? (
                      <img
                        src={supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl}
                        alt={profile.nickname || profile.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Avatar className="h-32 w-32">
                        <AvatarFallback className="text-4xl">
                          {profile.nickname?.charAt(0) || profile.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <h3 className="text-xl font-bold">
                        {profile.nickname || profile.full_name}
                        {profile.age && <span className="text-muted-foreground ml-1">, {profile.age}</span>}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>
                           {profile.distance !== undefined 
                            ? `${profile.distance} ${t('search.km')}` 
                            : getGenericLocationPhrase()}
                        </span>
                      </div>
                    </div>

                    {profile.bio && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {profile.bio}
                      </p>
                    )}

                    {profile.interests && profile.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {profile.interests.slice(0, 3).map((interest, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                        {profile.interests.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{profile.interests.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          // Aggiungi like
                          if (currentUser) {
                            supabase
                              .from("likes")
                              .insert({
                                from_user_id: currentUser,
                                to_user_id: profile.id,
                              })
                              .then(() => {
                                toast({
                                  title: t('search.likeSent'),
                                  description: `${t('search.likedProfile')} ${profile.nickname || profile.full_name}`,
                                });
                              });
                          }
                        }}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => navigate(`/profile/${profile.id}`)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {t('search.profile')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Paginazione */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mb-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  {t('search.previous')}
                </Button>
                <div className="flex items-center px-4">
                  {t('search.page')} {currentPage} {t('search.of')} {totalPages}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('search.next')}
                </Button>
              </div>
            )}
          </>
        )}

        {profiles.length === 0 && !loading && (
          <Card>
            <CardContent className="py-12 text-center">
              <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nessun risultato</h3>
              <p className="text-muted-foreground">
                Imposta i filtri e clicca su "Applica Filtri" per iniziare la ricerca
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Search;
