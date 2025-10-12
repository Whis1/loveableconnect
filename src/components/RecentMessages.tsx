import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

interface MatchWithLastMessage {
  match_id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface RecentMessagesProps {
  currentUserId: string;
}

export const RecentMessages = ({ currentUserId }: RecentMessagesProps) => {
  const navigate = useNavigate();
  const [matchesWithMessages, setMatchesWithMessages] = useState<MatchWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentMessages = async () => {
      // Get all matches for current user
      const { data: matches } = await supabase
        .from("matches")
        .select("id, user1_id, user2_id")
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (!matches) {
        setLoading(false);
        return;
      }

      // For each match, get last message and unread count
      const matchesData = await Promise.all(
        matches.slice(0, 5).map(async (match) => {
          const otherUserId = match.user1_id === currentUserId ? match.user2_id : match.user1_id;

          // Get other user's profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, nickname, avatar_url")
            .eq("id", otherUserId)
            .single();

          // Get last message
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("*")
            .eq("match_id", match.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from("messages")
            .select("*", { count: 'exact', head: true })
            .eq("match_id", match.id)
            .eq("receiver_id", currentUserId)
            .eq("read", false);

          let avatarUrl = null;
          if (profile?.avatar_url) {
            const { data: urlData } = supabase.storage
              .from('profile-images')
              .getPublicUrl(profile.avatar_url);
            avatarUrl = urlData.publicUrl;
          }

          return {
            match_id: match.id,
            otherUserId,
            otherUserName: profile?.nickname || profile?.full_name || "Utente",
            otherUserAvatar: avatarUrl,
            lastMessage: lastMessage?.content || "Inizia una conversazione",
            lastMessageTime: lastMessage?.created_at || match.id,
            unreadCount: unreadCount || 0,
          };
        })
      );

      // Sort by last message time
      matchesData.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );

      setMatchesWithMessages(matchesData);
      setLoading(false);
    };

    fetchRecentMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('recent-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchRecentMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messaggi Recenti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Messaggi Recenti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matchesWithMessages.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">
              Nessun messaggio ancora
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate("/matches")}
            >
              Vedi i tuoi Match
            </Button>
          </div>
        ) : (
          <>
            {matchesWithMessages.map((match) => (
              <div
                key={match.match_id}
                onClick={() => navigate(`/chat/${match.match_id}`)}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={match.otherUserAvatar || undefined} />
                  <AvatarFallback>
                    {match.otherUserName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm truncate">
                      {match.otherUserName}
                    </p>
                    {match.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs h-5 min-w-5 flex items-center justify-center">
                        {match.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {match.lastMessage}
                  </p>
                </div>
                <Send className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={() => navigate("/matches")}
            >
              Vedi Tutti i Messaggi
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
