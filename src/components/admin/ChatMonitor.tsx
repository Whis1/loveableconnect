import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  sender_profile?: {
    nickname: string;
    avatar_url?: string;
  };
  receiver_profile?: {
    nickname: string;
    avatar_url?: string;
  };
}

export const ChatMonitor = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("admin_messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          created_at,
          sender_id,
          receiver_id,
          sender_profile:profiles!messages_sender_id_fkey(nickname, avatar_url),
          receiver_profile:profiles!messages_receiver_id_fkey(nickname, avatar_url)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data as any || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Monitor Chat (Ultime 50)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <p className="text-muted-foreground">Caricamento...</p>
          ) : messages.length === 0 ? (
            <p className="text-muted-foreground">Nessun messaggio</p>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender_profile?.avatar_url} />
                      <AvatarFallback>
                        {message.sender_profile?.nickname?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">
                        {message.sender_profile?.nickname || "Utente"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        → {message.receiver_profile?.nickname || "Utente"}
                      </p>
                    </div>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleString("it-IT")}
                    </span>
                  </div>
                  <p className="text-sm pl-11">{message.content}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
