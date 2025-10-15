import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Heart, X, ArrowLeft, MapPin, Filter, User } from "lucide-react";
import { ImageDialog } from "@/components/ImageDialog";

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
}

const Explore = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    gender: "",
    minAge: "",
    maxAge: "",
    relationshipType: "",
  });

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
          title: "🎉 È un Match!",
          description: `Hai fatto match con ${profile.full_name}!`,
        });
      }

      setCurrentIndex(currentIndex + 1);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePass = () => {
    setCurrentIndex(currentIndex + 1);
  };

  const applyFilters = () => {
    let filtered = [...allProfiles];

    if (filters.gender && filters.gender !== "all") {
      filtered = filtered.filter(p => {
        if (filters.gender === "no-preference") return true;
        return p.gender?.toLowerCase() === filters.gender.toLowerCase();
      });
    }

    if (filters.minAge) {
      const minAge = parseInt(filters.minAge);
      filtered = filtered.filter(p => p.age && p.age >= minAge);
    }

    if (filters.maxAge) {
      const maxAge = parseInt(filters.maxAge);
      filtered = filtered.filter(p => p.age && p.age <= maxAge);
    }

    if (filters.relationshipType) {
      filtered = filtered.filter(p => p.relationship_type === filters.relationshipType);
    }

    setProfiles(filtered);
    setCurrentIndex(0);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      gender: "",
      minAge: "",
      maxAge: "",
      relationshipType: "",
    });
    setProfiles(allProfiles);
    setCurrentIndex(0);
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
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (currentIndex >= profiles.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Non ci sono più profili</h2>
            <p className="text-muted-foreground mb-6">
              Hai visto tutti i profili disponibili. Torna più tardi per nuove persone!
            </p>
            <Button onClick={() => navigate("/")}>
              Torna alla Dashboard
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
            Indietro
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtri
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label>Genere</Label>
                <Select value={filters.gender} onValueChange={(v) => setFilters({...filters, gender: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona genere" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="male">Uomo</SelectItem>
                    <SelectItem value="female">Donna</SelectItem>
                    <SelectItem value="trans">Trans</SelectItem>
                    <SelectItem value="non-binary">Non binario</SelectItem>
                    <SelectItem value="no-preference">Nessuna preferenza</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Età minima</Label>
                  <Input 
                    type="number" 
                    placeholder="18"
                    value={filters.minAge}
                    onChange={(e) => setFilters({...filters, minAge: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Età massima</Label>
                  <Input 
                    type="number" 
                    placeholder="99"
                    value={filters.maxAge}
                    onChange={(e) => setFilters({...filters, maxAge: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo di relazione</Label>
                <Select value={filters.relationshipType} onValueChange={(v) => setFilters({...filters, relationshipType: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="serious">Relazione seria</SelectItem>
                    <SelectItem value="casual">Relazione occasionale</SelectItem>
                    <SelectItem value="friendship">Amicizia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={applyFilters} className="flex-1">
                  Applica Filtri
                </Button>
                <Button onClick={resetFilters} variant="outline">
                  Reset
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
                    {currentProfile.relationship_type === 'serious' ? 'Relazione seria' :
                     currentProfile.relationship_type === 'casual' ? 'Occasionale' :
                     currentProfile.relationship_type === 'friendship' ? 'Amicizia' : ''}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <MapPin className="h-4 w-4" />
                <span>{currentProfile.city || "Vicino alle tue parti"}</span>
              </div>

              {currentProfile.bio && (
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <p className="text-sm italic">"{currentProfile.bio}"</p>
                </div>
              )}

              {currentProfile.interests && currentProfile.interests.length > 0 && (
                <div className="mb-4">
                  <p className="font-semibold mb-2 text-sm">Interessi</p>
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

        <div className="text-center mt-4 text-muted-foreground">
          {currentIndex + 1} di {profiles.length}
        </div>
      </div>
    </div>
  );
};

export default Explore;