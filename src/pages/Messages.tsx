import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useBanCheck } from "@/hooks/useBanCheck";

interface MatchWithMessages {
  id: string;
  created_at: string;
  otherUser: {
    id: string;
    full_name: string;
    nickname: string;
    is_admin_profile: boolean;
    avatar_url: string | null;
  };
  lastMessage: {
    content: string;
    created_at: string;
    read: boolean;
  } | null;
  unreadCount: number;
}

const Messages = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  useBanCheck(); // Check if user is banned
  const [matches, setMatches] = useState<MatchWithMessages[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchMatchesWithMessages = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setCurrentUserId(session.user.id);

      // Fetch matches
      const { data: matchesData, error } = await supabase
        .from("matches")
        .select("id, created_at, user1_id, user2_id")
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .order("created_at", { ascending: false });

      // Get hidden matches for current user
      const { data: hiddenMatches } = await supabase
        .from("hidden_matches")
        .select("match_id")
        .eq("user_id", session.user.id);
      
      const hiddenMatchIds = new Set(hiddenMatches?.map(h => h.match_id) || []);
      
      // Filter out hidden matches
      const visibleMatches = (matchesData || []).filter(match => !hiddenMatchIds.has(match.id));

      if (error) {
        console.error("Error fetching matches:", error);
        toast({
          title: t("messages.error"),
          description: t("messages.errorLoadingMessages"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // For each match, fetch profile and messages
      const matchesWithMessages = await Promise.all(
        visibleMatches.map(async (match) => {
          const otherUserId = match.user1_id === session.user.id 
            ? match.user2_id 
            : match.user1_id;

          // Fetch other user's profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, nickname, is_admin_profile, avatar_url")
            .eq("id", otherUserId)
            .single();

          // Fetch last message
          const { data: messagesData } = await supabase
            .from("messages")
            .select("content, created_at, read, receiver_id")
            .eq("match_id", match.id)
            .order("created_at", { ascending: false })
            .limit(1);

          // Count unread messages
          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: 'exact', head: true })
            .eq("match_id", match.id)
            .eq("receiver_id", session.user.id)
            .eq("read", false);

          return {
            id: match.id,
            created_at: match.created_at,
            otherUser: profile || {
              id: otherUserId,
              full_name: t("messages.unknownUser"),
              nickname: t("messages.unknownUser"),
              is_admin_profile: false,
              avatar_url: null,
            },
            lastMessage: messagesData && messagesData.length > 0 
              ? {
                  content: messagesData[0].content,
                  created_at: messagesData[0].created_at,
                  read: messagesData[0].receiver_id === session.user.id ? messagesData[0].read : true,
                }
              : null,
            unreadCount: unreadCount || 0,
          };
        })
      );

      // Filter out matches without messages and sort by last message
      const matchesWithLastMessage = matchesWithMessages
        .filter(match => match.lastMessage !== null)
        .sort((a, b) => {
          if (!a.lastMessage || !b.lastMessage) return 0;
          return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
        });

      setMatches(matchesWithLastMessage);
      setLoading(false);

      // Subscribe to new messages
      channel = supabase
        .channel('messages-list-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
          },
          () => {
            // Refetch when new message arrives
            fetchMatchesWithMessages();
          }
        )
        .subscribe();
    };

    fetchMatchesWithMessages();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [navigate, toast, t]);

  const handleHideConversation = async (matchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!currentUserId) return;

    const { error } = await supabase
      .from("hidden_matches")
      .insert({
        user_id: currentUserId,
        match_id: matchId,
      });

    if (error) {
      console.error("Error hiding conversation:", error);
      toast({
        title: t("messages.error"),
        description: t("messages.errorHidingConversation"),
        variant: "destructive",
      });
      return;
    }

    setMatches(prev => prev.filter(m => m.id !== matchId));
    toast({
      title: t("messages.conversationHidden"),
      description: t("messages.conversationHiddenDescription"),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("messages.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("messages.back")}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t("messages.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {matches.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {t("messages.noMessages")}
                </p>
                <Button onClick={() => navigate("/matches")}>
                  {t("messages.viewMatches")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <Card 
                    key={match.id} 
                    className="overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div 
                          className="flex items-center gap-4 flex-1 cursor-pointer"
                          onClick={() => navigate(`/chat/${match.id}`)}
                        >
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={match.otherUser.avatar_url || undefined} />
                          <AvatarFallback>
                            {(match.otherUser.is_admin_profile 
                              ? match.otherUser.nickname 
                              : match.otherUser.full_name).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-lg truncate">
                              {match.otherUser.is_admin_profile 
                                ? match.otherUser.nickname 
                                : match.otherUser.full_name}
                            </h3>
                            {match.unreadCount > 0 && (
                              <Badge variant="default" className="ml-2">
                                {match.unreadCount}
                              </Badge>
                            )}
                          </div>
                          {match.lastMessage && (
                            <>
                              <p className={`text-sm truncate ${match.unreadCount > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                {match.lastMessage.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(match.lastMessage.created_at).toLocaleString()}
                              </p>
                            </>
                          )}
                        </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleHideConversation(match.id, e)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

export default Messages;
