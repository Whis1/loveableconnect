import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, Lock, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LikeWithProfile {
  id: string;
  from_user_id: string;
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    nickname: string;
    avatar_url: string | null;
    bio: string | null;
    age: number | null;
    interests: string[] | null;
  };
}

const Likes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [likes, setLikes] = useState<LikeWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [checkingUnlock, setCheckingUnlock] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setCurrentUserId(session.user.id);

      // Check if user has unlocked likes
      const { data: unlockData } = await supabase
        .from("likes_unlocked")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setHasUnlocked(!!unlockData);
      setCheckingUnlock(false);

      // Fetch likes
      const { data: likesData, error } = await supabase
        .from("likes")
        .select("id, from_user_id, created_at")
        .eq("to_user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching likes:", error);
        toast({
          title: "Errore",
          description: "Impossibile caricare i like",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Fetch profiles for each like
      const likesWithProfiles = await Promise.all(
        (likesData || []).map(async (like) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, nickname, avatar_url, bio, age, interests")
            .eq("id", like.from_user_id)
            .single();

          return {
            id: like.id,
            from_user_id: like.from_user_id,
            created_at: like.created_at,
            profile: profile || {
              id: like.from_user_id,
              full_name: "Utente sconosciuto",
              nickname: "Utente",
              avatar_url: null,
              bio: null,
              age: null,
              interests: null,
            },
          };
        })
      );

      setLikes(likesWithProfiles);
      setLoading(false);
    };

    fetchData();
  }, [navigate, toast]);

  const handleUnlockLikes = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-unlock-payment');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
      
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile avviare il pagamento",
        variant: "destructive",
      });
    }
  };

  // Check URL params for success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const unlockStatus = params.get('unlock');
    
    if (unlockStatus === 'success') {
      // Record unlock in database
      if (currentUserId) {
        supabase
          .from('likes_unlocked')
          .insert({ user_id: currentUserId })
          .then(() => {
            toast({
              title: "Pagamento completato!",
              description: "Ora puoi vedere chi ti ha messo like",
            });
            // Remove query params and reload
            window.history.replaceState({}, '', '/likes');
            setHasUnlocked(true);
          });
      }
    } else if (unlockStatus === 'cancel') {
      toast({
        title: "Pagamento annullato",
        description: "Puoi sbloccare i like in qualsiasi momento",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/likes');
    }
  }, [toast, currentUserId]);

  if (loading || checkingUnlock) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-purple-500" />
              Like Ricevuti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasUnlocked && likes.length > 0 && (
              <div className="mb-6 p-6 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-950 dark:to-pink-950 rounded-lg text-center">
                <Lock className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                <h3 className="text-xl font-bold mb-2">Sblocca i tuoi Like</h3>
                <p className="text-muted-foreground mb-4">
                  Hai {likes.length} {likes.length === 1 ? 'persona' : 'persone'} interessata a te!
                  Sblocca per vedere chi ti ha messo like.
                </p>
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  onClick={handleUnlockLikes}
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Sblocca Ora - €2.99
                </Button>
              </div>
            )}

            {likes.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Non hai ancora ricevuto like. Continua a esplorare!
                </p>
                <Button onClick={() => navigate("/explore")}>
                  Esplora Profili
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {likes.map((like) => (
                  <Card 
                    key={like.id} 
                    className={`overflow-hidden ${!hasUnlocked ? 'relative' : ''}`}
                  >
                    {!hasUnlocked && (
                      <div className="absolute inset-0 backdrop-blur-lg bg-white/30 dark:bg-black/30 z-10 flex items-center justify-center">
                        <Lock className="h-12 w-12 text-purple-600" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage 
                            src={hasUnlocked && like.profile.avatar_url ? like.profile.avatar_url : undefined} 
                          />
                          <AvatarFallback>
                            {like.profile.nickname?.charAt(0) || like.profile.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {hasUnlocked ? like.profile.nickname : '???'}
                          </h3>
                          {hasUnlocked && like.profile.age && (
                            <p className="text-sm text-muted-foreground">
                              {like.profile.age} anni
                            </p>
                          )}
                          {hasUnlocked && like.profile.bio && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {like.profile.bio}
                            </p>
                          )}
                          {hasUnlocked && like.profile.interests && like.profile.interests.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {like.profile.interests.slice(0, 3).map((interest, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Like ricevuto {new Date(like.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {hasUnlocked && (
                          <Button onClick={() => navigate(`/explore`)}>
                            Esplora
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Likes;
