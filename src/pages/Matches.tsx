import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, MessageCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface MatchWithProfile {
  id: string;
  created_at: string;
  otherUser: {
    id: string;
    full_name: string;
    nickname: string;
    is_admin_profile: boolean;
    avatar_url: string | null;
    bio: string | null;
    city: string | null;
    translatedBio?: string | null;
  };
}

const toPublicAvatarUrl = (path: string | null) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from('profile-images').getPublicUrl(path).data.publicUrl;
};

const Matches = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setCurrentUserId(session.user.id);

      // Fetch matches with profile data
      const { data: matchesData, error } = await supabase
        .from("matches")
        .select(`
          id,
          created_at,
          user1_id,
          user2_id
        `)
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false });

      // Get hidden matches for current user (only those hidden from matches page)
      const { data: hiddenMatches } = await supabase
        .from("hidden_matches")
        .select("match_id")
        .eq("user_id", session.user.id)
        .in("hidden_from", ["matches", "both"]);
      
      const hiddenMatchIds = new Set(hiddenMatches?.map(h => h.match_id) || []);
      
      // Filter out hidden matches
      const visibleMatches = (matchesData || []).filter(match => !hiddenMatchIds.has(match.id));

      if (error) {
        console.error("Error fetching matches:", error);
        toast({
          title: t("matches.error"),
          description: t("matches.errorLoadingMatches"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // For each match, fetch the other user's profile - optimized
      const matchesWithProfiles = await Promise.all(
        visibleMatches.map(async (match) => {
          const otherUserId = match.user1_id === session.user.id 
            ? match.user2_id 
            : match.user1_id;

          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, nickname, is_admin_profile, avatar_url, bio, city")
            .eq("id", otherUserId)
            .single();

          return {
            id: match.id,
            created_at: match.created_at,
            otherUser: profile ? {
              ...profile,
              avatar_url: toPublicAvatarUrl(profile.avatar_url),
              translatedBio: profile.bio, // Use original bio for performance
            } : {
              id: otherUserId,
              full_name: t("matches.unknownUser"),
              nickname: t("matches.unknownUser"),
              is_admin_profile: false,
              avatar_url: null,
              bio: null,
              city: null,
              translatedBio: null,
            },
          };
        })
      );

      setMatches(matchesWithProfiles);
      setLoading(false);

      // Set up realtime subscription for new matches
      channel = supabase
        .channel('matches-channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'matches',
          },
          async (payload) => {
            const newMatch = payload.new as any;
            
            // Only process if this match involves the current user
            if (newMatch.user1_id !== session.user.id && newMatch.user2_id !== session.user.id) {
              return;
            }

            const otherUserId = newMatch.user1_id === session.user.id 
              ? newMatch.user2_id 
              : newMatch.user1_id;

            const { data: profile } = await supabase
              .from("profiles")
              .select("id, full_name, nickname, is_admin_profile, avatar_url, bio, city")
              .eq("id", otherUserId)
              .single();

            const matchWithProfile = {
              id: newMatch.id,
              created_at: newMatch.created_at,
              otherUser: profile ? {
                ...profile,
                avatar_url: toPublicAvatarUrl(profile.avatar_url),
                translatedBio: profile.bio, // Use original bio for performance
              } : {
                id: otherUserId,
                full_name: t("matches.unknownUser"),
                nickname: t("matches.unknownUser"),
                is_admin_profile: false,
                avatar_url: null,
                bio: null,
                city: null,
                translatedBio: null,
              },
            };

            setMatches(prev => [matchWithProfile, ...prev]);
            const displayName = matchWithProfile.otherUser.is_admin_profile 
              ? matchWithProfile.otherUser.nickname 
              : matchWithProfile.otherUser.full_name;
            toast({
              title: t("matches.newMatch"),
              description: `${t("matches.newMatchWith")} ${displayName}!`,
            });
          }
        )
        .subscribe();
    };

    setupRealtimeAndFetch();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [navigate, toast, t]);

  const handleHideMatch = async (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!currentUserId) return;

    // Delete the match completely so the profile reappears in Explore
    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId);

    if (error) {
      console.error("Error deleting match:", error);
      toast({
        title: t("matches.error"),
        description: t("matches.errorHidingMatch"),
        variant: "destructive",
      });
      return;
    }

    setMatches(prev => prev.filter(m => m.id !== matchId));
    toast({
      title: t("matches.matchHidden"),
      description: t("matches.matchHiddenDescription"),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("matches.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("matches.back")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t("matches.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {t("matches.noMatches")}
                </p>
                <Button onClick={() => navigate("/explore")}>
                  {t("matches.exploreProfiles")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <Card key={match.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={match.otherUser.avatar_url || undefined} />
                            <AvatarFallback>
                              {(match.otherUser.is_admin_profile 
                                ? match.otherUser.nickname 
                                : match.otherUser.full_name).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {match.otherUser.is_admin_profile 
                                ? match.otherUser.nickname 
                                : match.otherUser.full_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {t("matches.nearYourParts")}
                            </p>
                            {(match.otherUser.translatedBio || match.otherUser.bio) && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {match.otherUser.translatedBio || match.otherUser.bio}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {t("matches.matchSince")} {new Date(match.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => navigate(`/chat/${match.id}`)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            {t("matches.chat")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleHideMatch(match.id, e)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
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

export default Matches;