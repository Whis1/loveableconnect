import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, Trash2, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useTextTranslation } from "@/hooks/useTranslation";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import OnlineIndicator from "@/components/OnlineIndicator";
import matchHeartIcon from "@/assets/match-heart.png";

interface MatchWithProfile {
  id: string;
  created_at: string;
  last_message_at: string;
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
  const { translateText } = useTextTranslation();
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { unreadCounts, getUnreadForMatch } = useUnreadMessages(currentUserId);

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

      // For each match, fetch the other user's profile and last message timestamp
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

          // Get last message timestamp for sorting
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("created_at")
            .eq("match_id", match.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const translatedBio = profile?.bio ? await translateText(profile.bio) : null;

          return {
            id: match.id,
            created_at: match.created_at,
            last_message_at: lastMessage?.created_at || match.created_at,
            otherUser: profile ? {
              ...profile,
              avatar_url: toPublicAvatarUrl(profile.avatar_url),
              translatedBio,
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

      // Sort by last message timestamp (most recent first)
      matchesWithProfiles.sort((a, b) => 
        new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );

      setMatches(matchesWithProfiles);
      setLoading(false);

      // Set up realtime subscription for new matches and messages
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

            const translatedBio = profile?.bio ? await translateText(profile.bio) : null;

            const matchWithProfile = {
              id: newMatch.id,
              created_at: newMatch.created_at,
              last_message_at: newMatch.created_at,
              otherUser: profile ? {
                ...profile,
                avatar_url: toPublicAvatarUrl(profile.avatar_url),
                translatedBio,
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
            const displayName = matchWithProfile.otherUser.nickname;
            toast({
              title: t("matches.newMatch"),
              description: `${t("matches.newMatchWith")} ${displayName}!`,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${session.user.id}`,
          },
          async (payload) => {
            const newMessage = payload.new as any;
            
            // Update last_message_at for the match and move it to top
            setMatches(prev => {
              const matchIndex = prev.findIndex(m => m.id === newMessage.match_id);
              if (matchIndex === -1) return prev;
              
              const updatedMatch = {
                ...prev[matchIndex],
                last_message_at: newMessage.created_at,
              };
              
              // Remove from current position and add to top
              const newMatches = [...prev];
              newMatches.splice(matchIndex, 1);
              return [updatedMatch, ...newMatches];
            });

            // Show toast notification
            const match = matchesWithProfiles.find(m => m.id === newMessage.match_id);
            if (!match) return;

            const displayName = match.otherUser.nickname;
            
            toast({
              title: `Nuovo messaggio da ${displayName}`,
              description: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("matches.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-2 md:p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-3 md:mb-4">
          <Button variant="ghost" onClick={() => navigate("/")} size="sm">
            <ArrowLeft className="h-4 w-4 mr-1 md:mr-2" />
            {t("matches.back")}
          </Button>
        </div>

        <Card className="bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/app-background.png')" }}>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-xl md:text-2xl">{t("matches.title")}</CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-6">
            {matches.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <p className="text-muted-foreground mb-4 text-sm md:text-base">
                  {t("matches.noMatches")}
                </p>
                <Button onClick={() => navigate("/explore")} size="sm">
                  {t("matches.exploreProfiles")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {matches.map((match) => (
                  <Card key={match.id} className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-background to-accent/5">
                    <CardContent className="p-4 md:p-5">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="relative shrink-0">
                            <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-primary/20 shadow-md">
                              <AvatarImage src={match.otherUser.avatar_url || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl">
                                {match.otherUser.nickname.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1">
                              <OnlineIndicator userId={match.otherUser.id} size="md" />
                            </div>
                            <div className="absolute top-0 -left-1 rounded-full shadow-md">
                              <img src={matchHeartIcon} alt="Match" className="h-5 w-5 md:h-6 md:w-6 object-contain" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg md:text-xl truncate bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              {match.otherUser.nickname}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                <Heart className="h-3 w-3 mr-1 fill-current" />
                                {t("matches.matchSince")} {new Date(match.created_at).toLocaleDateString()}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end md:ml-4">
                          <div className="relative">
                            <Button
                              onClick={() => navigate(`/chat/${match.id}`)}
                              size="sm"
                              className="flex-1 md:flex-none"
                            >
                              <MessageCircle className="h-4 w-4 md:mr-2" />
                              <span className="hidden md:inline">{t("matches.chat")}</span>
                            </Button>
                            {getUnreadForMatch(match.id) > 0 && (
                              <Badge 
                                variant="destructive" 
                                className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 flex items-center justify-center p-0 text-[10px] md:text-xs"
                              >
                                {getUnreadForMatch(match.id)}
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleHideMatch(match.id, e)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9 md:h-10 md:w-10"
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