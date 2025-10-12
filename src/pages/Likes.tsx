import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Heart, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LikeWithProfile {
  id: string;
  created_at: string;
  from_user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    bio: string | null;
    age: number | null;
    city: string | null;
    interests: string[] | null;
  };
}

const Likes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [likes, setLikes] = useState<LikeWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLikes = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch likes received with profile data
      const { data: likesData, error } = await supabase
        .from("likes")
        .select(`
          id,
          created_at,
          from_user_id,
          from_profile:profiles!likes_from_user_id_fkey(
            id,
            full_name,
            avatar_url,
            bio,
            age,
            city,
            interests
          )
        `)
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

      const formattedLikes = (likesData || []).map((like: any) => ({
        id: like.id,
        created_at: like.created_at,
        from_user: like.from_profile || {
          id: like.from_user_id,
          full_name: "Utente sconosciuto",
          avatar_url: null,
          bio: null,
          age: null,
          city: null,
          interests: null,
        },
      }));

      setLikes(formattedLikes);
      setLoading(false);
    };

    fetchLikes();
  }, [navigate, toast]);

  const handleLikeBack = async (userId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { error } = await supabase
        .from("likes")
        .insert({
          from_user_id: session.user.id,
          to_user_id: userId,
        });

      if (error) throw error;

      toast({
        title: "🎉 È un Match!",
        description: "Ora potete chattare insieme!",
      });

      // Remove from likes list
      setLikes(likes.filter(like => like.from_user.id !== userId));
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
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
            <CardTitle className="text-2xl">Like Ricevuti</CardTitle>
          </CardHeader>
          <CardContent>
            {likes.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Non hai ancora ricevuto like. Continua a migliorare il tuo profilo!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {likes.map((like) => (
                  <Card key={like.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={like.from_user.avatar_url || undefined} />
                          <AvatarFallback className="text-2xl">
                            {like.from_user.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-xl">
                              {like.from_user.full_name}
                            </h3>
                            {like.from_user.age && (
                              <span className="text-muted-foreground">
                                {like.from_user.age}
                              </span>
                            )}
                          </div>
                          
                          {like.from_user.city && (
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                              <MapPin className="h-4 w-4" />
                              <span>{like.from_user.city}</span>
                            </div>
                          )}

                          {like.from_user.bio && (
                            <p className="text-muted-foreground mb-3">
                              {like.from_user.bio}
                            </p>
                          )}

                          {like.from_user.interests && like.from_user.interests.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {like.from_user.interests.map((interest, index) => (
                                <Badge key={index} variant="secondary">
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <Button
                            onClick={() => handleLikeBack(like.from_user.id)}
                            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                          >
                            <Heart className="h-4 w-4 mr-2" />
                            Ricambia il Like
                          </Button>
                        </div>
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