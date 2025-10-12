import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, LogOut, Users, Sparkles, Search } from "lucide-react";
import { UserProfileCard } from "@/components/UserProfileCard";
import { RecentMessages } from "@/components/RecentMessages";

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
      <div className="container mx-auto p-4 max-w-7xl">
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

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* User Profile - Larger card on the left */}
          <div className="lg:col-span-1">
            {user && <UserProfileCard userId={user.id} />}
          </div>

          {/* Stats and Messages - Right side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900 border-pink-200 dark:border-pink-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-pink-700 dark:text-pink-300">
                    <Heart className="h-5 w-5" />
                    Match
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold text-pink-600 dark:text-pink-400 mb-4">
                    {matches.length}
                  </div>
                  <Button 
                    className="w-full bg-pink-600 hover:bg-pink-700"
                    onClick={() => navigate("/matches")}
                  >
                    Visualizza Match
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <Sparkles className="h-5 w-5" />
                    Like Ricevuti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-5xl font-bold text-purple-600 dark:text-purple-400 mb-4">
                    {likesReceived.length}
                  </div>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => navigate("/likes")}
                  >
                    Vedi Chi Ti Piace
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Messages */}
            {user && <RecentMessages currentUserId={user.id} />}
          </div>
        </div>

        {/* Discover Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 dark:from-pink-950 dark:via-purple-950 dark:to-indigo-950">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Search className="h-6 w-6" />
              Scopri Nuove Persone
            </CardTitle>
            <CardDescription>
              Esplora i profili con filtri personalizzati e trova la tua anima gemella
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => navigate("/explore")}
            >
              <Search className="h-5 w-5 mr-2" />
              Inizia a Esplorare con Filtri
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;