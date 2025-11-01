import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, Users, Sparkles, Search, MessageCircle } from "lucide-react";
import { UserProfileCard } from "@/components/UserProfileCard";
import { useTranslation } from "react-i18next";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { useBanCheck } from "@/hooks/useBanCheck";
import { DashboardControls } from "@/components/DashboardControls";
import { GeolocationBanner } from "@/components/GeolocationBanner";
import { InboxDropdown } from "@/components/InboxDropdown";
import loveIcon from "@/assets/love-icon.png";

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
  const { t } = useTranslation();
  useBanCheck(); // Check if user is banned
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<any[]>([]);
  const [likesReceived, setLikesReceived] = useState<any[]>([]);
  const [showGeolocationBanner, setShowGeolocationBanner] = useState(false);

  useEffect(() => {
    let matchesChannel: ReturnType<typeof supabase.channel> | null = null;
    let likesChannel: ReturnType<typeof supabase.channel> | null = null;
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;
    let hiddenMatchesChannel: ReturnType<typeof supabase.channel> | null = null;

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

      // Get hidden matches for current user (only those hidden from matches page)
      const { data: hiddenMatches } = await supabase
        .from("hidden_matches")
        .select("match_id")
        .eq("user_id", session.user.id)
        .in("hidden_from", ["matches", "both"]);
      
      const hiddenMatchIds = new Set(hiddenMatches?.map(h => h.match_id) || []);
      
      // Filter out hidden matches
      const visibleMatches = (matchesData || []).filter(match => !hiddenMatchIds.has(match.id));
      setMatches(visibleMatches);

      // Fetch likes received
      const { data: likesData } = await supabase
        .from("likes")
        .select("*")
        .eq("to_user_id", session.user.id);

      setLikesReceived(likesData || []);

      setLoading(false);

      // Set up realtime subscription for profile updates
      profileChannel = supabase
        .channel('dashboard-profile')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('Profile updated in dashboard:', payload.new);
            setProfile(payload.new as Profile);
          }
        )
        .subscribe();

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
                title: t("dashboard.newMatch"),
                description: t("dashboard.newMatchDescription"),
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
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'likes',
          },
          async (payload) => {
            const deletedLike = payload.old as any;
            // When a like is deleted, it might mean a match was created
            // Refresh matches to show the new match
            if (deletedLike.to_user_id === session.user.id || deletedLike.from_user_id === session.user.id) {
              const { data: matchesData } = await supabase
                .from("matches")
                .select("*")
                .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`);

              const { data: hiddenMatches } = await supabase
                .from("hidden_matches")
                .select("match_id")
                .eq("user_id", session.user.id)
                .in("hidden_from", ["matches", "both"]);
              
              const hiddenMatchIds = new Set(hiddenMatches?.map(h => h.match_id) || []);
              const visibleMatches = (matchesData || []).filter(match => !hiddenMatchIds.has(match.id));
              setMatches(visibleMatches);
              
              // Also update likes list
              const { data: likesData } = await supabase
                .from("likes")
                .select("*")
                .eq("to_user_id", session.user.id);
              setLikesReceived(likesData || []);
            }
          }
        )
        .subscribe();

      // Set up realtime subscription for hidden matches
      hiddenMatchesChannel = supabase
        .channel('dashboard-hidden-matches')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'hidden_matches',
          },
          (payload) => {
            const hiddenMatch = payload.new as any;
            if (hiddenMatch.user_id === session.user.id) {
              setMatches(prev => prev.filter(m => m.id !== hiddenMatch.match_id));
            }
          }
        )
        .subscribe();
    };

    fetchUserData();

    // Refetch data when window regains focus (user returns to dashboard)
    const handleFocus = () => {
      fetchUserData();
    };
    
    window.addEventListener('focus', handleFocus);

    // Realtime listener for deleted likes (when matches are created)
    const likesDeleteChannel = supabase
      .channel('likes-delete-channel')
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'likes',
        },
        async (payload) => {
          // When a like is deleted, refresh user data
          await fetchUserData();
        }
      )
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      subscription.unsubscribe();
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
      if (matchesChannel) {
        supabase.removeChannel(matchesChannel);
      }
      if (likesChannel) {
        supabase.removeChannel(likesChannel);
      }
      if (hiddenMatchesChannel) {
        supabase.removeChannel(hiddenMatchesChannel);
      }
      supabase.removeChannel(likesDeleteChannel);
    };
  }, [navigate, toast]);

  const handleExploreClick = () => {
    const geolocationEnabled = localStorage.getItem("geolocationEnabled");
    if (geolocationEnabled === "true") {
      navigate("/explore");
    } else {
      setShowGeolocationBanner(true);
    }
  };

  const handleActivateGeolocation = () => {
    // The GeolocationBanner component now handles saving to localStorage
    setShowGeolocationBanner(false);
    toast({
      title: "✓ Geolocalizzazione attivata",
      description: "Ora puoi esplorare i profili nelle tue vicinanze",
    });
    navigate("/explore");
  };

  const handleCloseGeolocationBanner = () => {
    setShowGeolocationBanner(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("dashboard.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-purple-950 dark:to-indigo-950">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-20 dark:opacity-30" 
        style={{
          backgroundImage: 'url(/images/love-background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <DashboardControls />
      
      <div className="container mx-auto p-3 md:p-4 max-w-7xl relative z-10 pt-16 md:pt-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:justify-end items-center gap-4 md:gap-6 mb-6 md:mb-8 animate-fade-in">
          <div className="flex items-center gap-3 order-2 md:order-1">
            <img src={loveIcon} alt="Love Icon" className="h-12 w-12 md:h-14 md:w-14" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {t("dashboard.title")}
              </h1>
              <p className="text-xs text-muted-foreground">{t("dashboard.tagline")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 order-1 md:order-2">
            <InboxDropdown />
            <CreditsDisplay />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          {/* User Profile Card - Redesigned */}
          <div className="lg:col-span-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {user && <UserProfileCard userId={user.id} />}
          </div>

          {/* Stats and Messages */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Cards - Redesigned */}
            <div className="grid gap-4 md:grid-cols-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {/* Matches Card */}
              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                {/* Card Background */}
                <div 
                  className="absolute inset-0 opacity-10" 
                  style={{
                    backgroundImage: 'url(/images/love-background.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Heart className="h-5 w-5" fill="white" />
                    </div>
                    <span className="font-bold">{t("dashboard.matches")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-6xl font-black mb-4 drop-shadow-lg">
                    {matches.length}
                  </div>
                  <Button 
                    className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 text-white font-semibold shadow-lg group-hover:shadow-xl transition-all duration-300"
                    onClick={() => navigate("/matches")}
                  >
                    {t("dashboard.viewMatches")}
                    <Heart className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* Likes Card */}
              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                {/* Card Background */}
                <div 
                  className="absolute inset-0 opacity-10" 
                  style={{
                    backgroundImage: 'url(/images/love-background.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="font-bold">{t("dashboard.likesReceived")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="text-6xl font-black mb-4 drop-shadow-lg">
                    {likesReceived.length}
                  </div>
                  <Button 
                    className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 text-white font-semibold shadow-lg group-hover:shadow-xl transition-all duration-300"
                    onClick={() => navigate("/likes")}
                  >
                    {t("dashboard.seeWhoLikes")}
                    <Sparkles className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Discover and Support */}
            <div className="grid gap-4 md:grid-cols-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {/* Discover Card */}
              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                onClick={handleExploreClick}
              >
                {/* Card Background */}
                <div 
                  className="absolute inset-0 opacity-10" 
                  style={{
                    backgroundImage: 'url(/images/love-background.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Search className="h-5 w-5" />
                    </div>
                    <span className="font-bold">{t("dashboard.discover")}</span>
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    {t("dashboard.discoverDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-white/90 mb-6">
                    {t("dashboard.exploreProfiles")}
                  </p>
                  <Button 
                    className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 text-white font-semibold shadow-lg group-hover:shadow-xl transition-all duration-300"
                  >
                    {t("dashboard.exploreProfiles")}
                    <Users className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              
              {/* Support Card */}
              <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                onClick={() => navigate("/support")}
              >
                <div 
                  className="absolute inset-0 opacity-10" 
                  style={{
                    backgroundImage: 'url(/images/love-background.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
                <CardHeader className="relative">
                  <CardTitle className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <span className="font-bold">{t("dashboard.support")}</span>
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    {t("dashboard.supportDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-white/90 mb-6">
                    {t("dashboard.contactSupport")}
                  </p>
                  <Button 
                    className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 text-white font-semibold shadow-lg group-hover:shadow-xl transition-all duration-300"
                  >
                    {t("dashboard.sendMessage")}
                    <MessageCircle className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Geolocation Banner */}
      {showGeolocationBanner && (
        <GeolocationBanner
          onActivate={handleActivateGeolocation}
          onClose={handleCloseGeolocationBanner}
        />
      )}
    </div>
  );
};

export default Dashboard;