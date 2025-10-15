import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Heart, X, ArrowLeft, MapPin, Filter, User } from "lucide-react";
import { ImageDialog } from "@/components/ImageDialog";
import { getGenericLocationPhrase } from "@/lib/utils";

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
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  
  const [ageRange, setAgeRange] = useState([18, 90]);
  const [distanceRange, setDistanceRange] = useState([1, 100]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);

  const genderOptions = [
    { value: "male", label: t("explore.genders.male") },
    { value: "female", label: t("explore.genders.female") },
    { value: "transexual", label: t("explore.genders.transexual") },
    { value: "transgender", label: t("explore.genders.transgender") },
    { value: "homosexual", label: t("explore.genders.homosexual") },
    { value: "non-binary", label: t("explore.genders.nonBinary") },
  ];

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setCurrentUser(session.user.id);

      // Fetch profiles excluding current user and already liked profiles
      const { data: likedProfiles } = await supabase
        .from("likes")
        .select("to_user_id")
        .eq("from_user_id", session.user.id);

      const likedIds = likedProfiles?.map(l => l.to_user_id) || [];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", session.user.id)
        .not("id", "in", `(${likedIds.join(",") || "00000000-0000-0000-0000-000000000000"})`)
        .limit(50);

      setAllProfiles(profilesData || []);
      setProfiles(profilesData || []);
      setLoading(false);
    };

    fetchProfiles();
  }, [navigate]);

  const handleLike = async () => {
    if (!currentUser || currentIndex >= profiles.length) return;

    const profile = profiles[currentIndex];

    try {
      const { error } = await supabase
        .from("likes")
        .insert({
          from_user_id: currentUser,
          to_user_id: profile.id,
        });

      if (error) throw error;

      // Check if it's a match
      const { data: mutualLike } = await supabase
        .from("likes")
        .select("*")
        .eq("from_user_id", profile.id)
        .eq("to_user_id", currentUser)
        .single();

      if (mutualLike) {
        toast({
          title: t("explore.match.title"),
          description: t("explore.match.description", { name: profile.full_name }),
        });
      }

      setCurrentIndex(currentIndex + 1);
    } catch (error: any) {
      toast({
        title: t("explore.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePass = () => {
    setCurrentIndex(currentIndex + 1);
  };

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

  const applyFilters = () => {
    let filtered = [...allProfiles];

    // Filtro età
    filtered = filtered.filter(p => p.age && p.age >= ageRange[0] && p.age <= ageRange[1]);

    // Filtro genere
    if (selectedGenders.length > 0) {
      filtered = filtered.filter(p => p.gender && selectedGenders.includes(p.gender));
    }

    // Calcola distanza se la posizione è disponibile
    if (userLocation && locationPermission) {
      filtered = filtered
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
            const distance = (profile as any).distance;
            return distance >= distanceRange[0] && distance <= distanceRange[1];
          }
          return false;
        });

      filtered.sort((a, b) => ((a as any).distance || 999999) - ((b as any).distance || 999999));
    } else {
      filtered.sort((a, b) => {
        const dateA = a.last_active ? new Date(a.last_active).getTime() : 0;
        const dateB = b.last_active ? new Date(b.last_active).getTime() : 0;
        return dateB - dateA;
      });
    }

    setProfiles(filtered);
    setCurrentIndex(0);
    setShowFilters(false);
    
    toast({
      title: t("explore.filtersApplied"),
      description: t("explore.profilesFound", { count: filtered.length }),
    });
  };

  const resetFilters = () => {
    setAgeRange([18, 90]);
    setDistanceRange([1, 100]);
    setSelectedGenders([]);
    setProfiles(allProfiles);
    setCurrentIndex(0);
  };

  const toggleGender = (gender: string) => {
    setSelectedGenders(prev => 
      prev.includes(gender) 
        ? prev.filter(g => g !== gender)
        : [...prev, gender]
    );
  };

  const currentProfile = profiles[currentIndex];

  useEffect(() => {
    if (currentProfile?.avatar_url) {
      const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(currentProfile.avatar_url);
      setAvatarUrl(data.publicUrl);
    } else {
      setAvatarUrl(null);
    }
  }, [currentProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("explore.loading")}</p>
      </div>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">{t("explore.noMoreProfiles")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("explore.noMoreProfilesDescription")}
            </p>
            <Button onClick={() => navigate("/")}>
              {t("explore.backToDashboard")}
            </Button>
          </CardContent>
        </Card>
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
              {/* Richiesta Posizione */}
              {!locationPermission && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        {t("explore.geolocation.permissionTitle")}
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        {t("explore.geolocation.permissionDescription")}
                      </p>
                      <Button onClick={requestLocationPermission} size="sm" variant="default">
                        {t("explore.geolocation.activateButton")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {locationPermission && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t("explore.geolocation.active")}
                  </p>
                </div>
              )}

              {/* Filtro Età */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">{t("explore.ageRange", { min: ageRange[0], max: ageRange[1] })}</Label>
                <Slider
                  value={ageRange}
                  onValueChange={setAgeRange}
                  min={18}
                  max={90}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Filtro Distanza */}
              {locationPermission && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">{t("explore.distanceRange", { min: distanceRange[0], max: distanceRange[1] })}</Label>
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
                <Label className="text-base font-semibold">{t("explore.genderLabel")}</Label>
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

              {/* Pulsanti Azione */}
              <div className="flex gap-2">
                <Button onClick={applyFilters} className="flex-1">
                  {t("explore.applyFilters")}
                </Button>
                <Button onClick={resetFilters} variant="outline">
                  {t("explore.resetFilters")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden">
          <CardHeader className="relative p-0">
            <ImageDialog 
              src={avatarUrl || ""} 
              alt={currentProfile.nickname || currentProfile.full_name}
            >
              <div className="aspect-[3/4] bg-gradient-to-br from-pink-200 to-purple-200 dark:from-pink-900 dark:to-purple-900 flex items-center justify-center cursor-pointer hover:opacity-95 transition-opacity">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={currentProfile.nickname || currentProfile.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Avatar className="h-48 w-48">
                    <AvatarFallback className="text-6xl">
                      {currentProfile.nickname?.charAt(0) || currentProfile.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </ImageDialog>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <h2 className="text-3xl font-bold">{currentProfile.nickname || currentProfile.full_name}</h2>
                  {currentProfile.age && (
                    <span className="text-2xl text-muted-foreground">{currentProfile.age}</span>
                  )}
                </div>
                {currentProfile.relationship_type && (
                  <Badge variant="secondary" className="text-xs">
                    {t(`explore.relationshipTypes.${currentProfile.relationship_type}`)}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <MapPin className="h-4 w-4" />
                <span>{getGenericLocationPhrase(t)}</span>
              </div>

              {currentProfile.bio && (
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <p className="text-sm italic">"{currentProfile.bio}"</p>
                </div>
              )}

              {currentProfile.interests && currentProfile.interests.length > 0 && (
                <div className="mb-4">
                  <p className="font-semibold mb-2 text-sm">{t("explore.interests")}</p>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.interests.map((interest, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 h-16"
                onClick={handlePass}
              >
                <X className="h-8 w-8 text-gray-500" />
              </Button>
              <Button
                size="lg"
                className="flex-1 h-16 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                onClick={handleLike}
              >
                <Heart className="h-8 w-8" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Explore;