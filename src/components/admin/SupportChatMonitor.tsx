import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SupportMessage {
  id: string;
  user_id: string;
  user_email: string;
  message: string;
  is_admin_response: boolean;
  created_at: string;
  read: boolean;
}

interface UserConversation {
  user_id: string;
  user_email: string;
  unread_count: number;
  last_message: string;
  last_message_time: string;
}

export const SupportChatMonitor = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<UserConversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('admin-support-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
        },
        () => {
          fetchConversations();
          if (selectedUserId) {
            fetchMessages(selectedUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('user_id, user_email, created_at, message, is_admin_response, read')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by user
      const grouped = (data || []).reduce((acc: Record<string, UserConversation>, msg) => {
        if (!acc[msg.user_id]) {
          acc[msg.user_id] = {
            user_id: msg.user_id,
            user_email: msg.user_email,
            unread_count: 0,
            last_message: msg.message,
            last_message_time: msg.created_at,
          };
        }
        if (!msg.is_admin_response && !msg.read) {
          acc[msg.user_id].unread_count++;
        }
        return acc;
      }, {});

      setConversations(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark as read
      await supabase
        .from('support_messages')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('is_admin_response', false);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    fetchMessages(userId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;

    setLoading(true);
    try {
      const selectedConv = conversations.find(c => c.user_id === selectedUserId);
      if (!selectedConv) return;

      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: selectedUserId,
          user_email: selectedConv.user_email,
          message: newMessage,
          is_admin_response: true,
        });

      if (error) throw error;

      setNewMessage("");
      toast({
        title: "Risposta inviata",
        description: "La tua risposta è stata inviata all'utente",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la risposta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Chat di Supporto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
          {/* Lista conversazioni */}
          <div className="md:col-span-1 border-r pr-4">
            <h3 className="font-semibold mb-3">Conversazioni</h3>
            <ScrollArea className="h-[520px]">
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessuna conversazione
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.user_id}
                      onClick={() => handleSelectUser(conv.user_id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedUserId === conv.user_id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4" />
                        <span className="font-medium text-sm truncate">
                          {conv.user_email}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Area messaggi */}
          <div className="md:col-span-2">
            {selectedUserId ? (
              <>
                <ScrollArea className="h-[480px] pr-4 mb-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.is_admin_response ? 'justify-end' : 'justify-start'}`}
                      >
                        {!msg.is_admin_response && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-secondary">
                              U
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            msg.is_admin_response
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {msg.is_admin_response && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              A
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Input
                    placeholder="Scrivi una risposta..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
                    disabled={loading}
                  />
                  <Button onClick={handleSendMessage} disabled={loading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Seleziona una conversazione per iniziare
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};