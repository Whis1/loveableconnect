import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, LogOut, UserCircle, Users, Sparkles } from "lucide-react";

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

interface UserRole {
  role: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [likesReceived, setLikesReceived] = useState<any[]>([]);

  useEffect(() => {
    let matchesChannel: ReturnType<typeof supabase.channel> | null = null;
    let likesChannel: ReturnType<typeof supabase.channel> | null = null;

    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      // Fetch role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setUserRole(roleData?.role || null);

      // Fetch matches
      const { data: matchesData } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`);

      setMatches(matchesData || []);

      // Fetch likes received
      const { data: likesData } = await supabase
        .from("likes")
        .select("*")
        .eq("to_user_id", session.user.id);

      setLikesReceived(likesData || []);

      setLoading(false);

      // Set up realtime subscription for new matches
      matchesChannel = supabase
        .channel('dashboard-matches')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
          },
          (payload) => {
            const newMatch = payload.new as any;
            if (newMatch.user1_id === session.user.id || newMatch.user2_id === session.user.id) {
              setMatches(prev => [newMatch, ...prev]);
              toast({
                title: "Nuovo Match! 🎉",
                description: "Hai un nuovo match!",
              });
            }
          }
        )
        .subscribe();

      // Set up realtime subscription for new likes
      likesChannel = supabase
        .channel('dashboard-likes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'likes',
          },
          (payload) => {
            const newLike = payload.new as any;
            if (newLike.to_user_id === session.user.id) {
              setLikesReceived(prev => [newLike, ...prev]);
            }
          }
        )
        .subscribe();
    };

    fetchUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => {
      subscription.unsubscribe();
      if (matchesChannel) {
        supabase.removeChannel(matchesChannel);
      }
      if (likesChannel) {
        supabase.removeChannel(likesChannel);
      }
    };
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-pink-500" />
            <h1 className="text-3xl font-bold">LovableConnect</h1>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Il Mio Profilo</CardTitle>
                {userRole && (
                  <Badge variant={userRole === "creator" ? "default" : "secondary"}>
                    {userRole === "creator" ? "Creator" : "Utente"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {profile?.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => navigate("/profile/edit")}
              >
                <UserCircle className="h-4 w-4 mr-2" />
                Modifica Profilo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Match
              </CardTitle>
              <CardDescription>Le tue connessioni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-pink-500 mb-4">
                {matches.length}
              </div>
              <Button 
                className="w-full"
                onClick={() => navigate("/matches")}
              >
                Visualizza Match
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Like Ricevuti
              </CardTitle>
              <CardDescription>Persone interessate a te</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-500 mb-4">
                {likesReceived.length}
              </div>
              <Button 
                className="w-full"
                variant="secondary"
                onClick={() => navigate("/likes")}
              >
                Vedi Chi Ti Piace
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Scopri Nuove Persone
            </CardTitle>
            <CardDescription>
              Esplora i profili e trova la tua anima gemella
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => navigate("/explore")}
            >
              Inizia a Esplorare
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;