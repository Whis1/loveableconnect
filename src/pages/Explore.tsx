import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, X, ArrowLeft, MapPin, Calendar } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  bio: string | null;
  age: number | null;
  gender: string | null;
  city: string | null;
  interests: string[] | null;
  avatar_url: string | null;
  photos: string[] | null;
}

const Explore = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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
        .limit(20);

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

  const currentProfile = profiles[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
      <div className="container mx-auto max-w-2xl">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="relative p-0">
            <div className="aspect-[3/4] bg-gradient-to-br from-pink-200 to-purple-200 dark:from-pink-900 dark:to-purple-900 flex items-center justify-center">
              {currentProfile.avatar_url ? (
                <img 
                  src={currentProfile.avatar_url} 
                  alt={currentProfile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Avatar className="h-48 w-48">
                  <AvatarFallback className="text-6xl">
                    {currentProfile.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-3xl font-bold">{currentProfile.full_name}</h2>
                {currentProfile.age && (
                  <span className="text-2xl text-muted-foreground">{currentProfile.age}</span>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="h-4 w-4" />
                <span>Vicino alle tue parti</span>
              </div>

              {currentProfile.bio && (
                <p className="text-muted-foreground mt-4">{currentProfile.bio}</p>
              )}

              {currentProfile.interests && currentProfile.interests.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold mb-2">Interessi:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.interests.map((interest, index) => (
                      <Badge key={index} variant="secondary">
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