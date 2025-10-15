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
        matches.slice(0, 3).map(async (match) => {
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
      <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-500 to-cyan-600">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] pointer-events-none" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="font-bold">Messaggi</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <p className="text-white/90">Caricamento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-500 to-cyan-600 group hover:shadow-2xl transition-all duration-300">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAtMTBjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] pointer-events-none" />
      
      <CardHeader className="relative bg-white/10 backdrop-blur-sm border-b border-white/20 p-4">
        <CardTitle className="flex items-center gap-2 text-white text-lg">
          <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform">
            <MessageCircle className="h-4 w-4" />
          </div>
          <span className="font-bold">Messaggi</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-2 p-4 relative">
        {matchesWithMessages.length === 0 ? (
          <div className="text-center py-6">
            <div className="mb-3 flex justify-center">
              <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
            </div>
            <p className="text-white text-sm font-medium mb-3">
              Attualmente non hai nessun messaggio
            </p>
            <Button 
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 text-white font-semibold text-sm"
              onClick={() => navigate("/matches")}
            >
              Vedi i tuoi messaggi
              <Send className="h-3.5 w-3.5 ml-2" />
            </Button>
          </div>
        ) : (
          <>
            {matchesWithMessages.map((match) => (
              <div
                key={match.match_id}
                onClick={() => navigate(`/chat/${match.match_id}`)}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 cursor-pointer transition-all duration-300 border border-white/20"
              >
                <Avatar className="h-10 w-10 border-2 border-white/30">
                  <AvatarImage src={match.otherUserAvatar || undefined} />
                  <AvatarFallback className="bg-white/20 text-white font-bold text-sm">
                    {match.otherUserName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-xs truncate text-white">
                      {match.otherUserName}
                    </p>
                    {match.unreadCount > 0 && (
                      <Badge className="text-xs h-4 min-w-4 flex items-center justify-center bg-white text-blue-600 hover:bg-white/90 px-1.5">
                        {match.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/80 truncate">
                    {match.lastMessage}
                  </p>
                </div>
                <Send className="h-3.5 w-3.5 text-white/70 flex-shrink-0 mt-1" />
              </div>
            ))}
            <Button 
              className="w-full mt-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0 text-white font-semibold text-sm py-2"
              onClick={() => navigate("/matches")}
            >
              Vedi Tutti i Messaggi
              <MessageCircle className="h-3.5 w-3.5 ml-2" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
