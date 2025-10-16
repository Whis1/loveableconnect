import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { GifPicker } from "@/components/chat/GifPicker";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatUserProfile } from "@/components/chat/ChatUserProfile";
import { useCredits } from "@/hooks/useCredits";
import { useTranslation } from "react-i18next";

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'emoji' | 'gif';
  media_url: string | null;
  created_at: string;
  read: boolean;
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

const Chat = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { deductCredits } = useCredits();

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      if (!matchId) {
        navigate("/matches");
        return;
      }

      setCurrentUser(session.user.id);

      // Fetch match to find other user
      const { data: match } = await supabase
        .from("matches")
        .select("user1_id, user2_id")
        .eq("id", matchId)
        .single();

      if (!match) {
        toast({
          title: t("chat.error"),
          description: t("chat.matchNotFound"),
          variant: "destructive",
        });
        navigate("/matches");
        return;
      }

      const otherUserId = match.user1_id === session.user.id 
        ? match.user2_id 
        : match.user1_id;

      // Fetch other user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", otherUserId)
        .single();

      if (!profile) {
        toast({
          title: t("chat.error"),
          description: t("chat.profileNotFound"),
          variant: "destructive",
        });
        navigate("/matches");
        return;
      }

      setOtherUser(profile);

      // Fetch messages
      const { data: messagesData } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      setMessages((messagesData || []) as Message[]);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("match_id", matchId)
        .eq("receiver_id", session.user.id)
        .eq("read", false);

      setLoading(false);

      // Subscribe to new messages with realtime
      const channel = supabase
        .channel(`messages-${matchId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            
            // Only add if not already in the list (prevent duplicates)
            setMessages((prev) => {
              const exists = prev.some(m => m.id === newMsg.id);
              if (exists) return prev;
              return [...prev, newMsg];
            });
            
            // Mark as read if received
            if (newMsg.receiver_id === session.user.id) {
              supabase
                .from("messages")
                .update({ read: true })
                .eq("id", newMsg.id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    initChat();
  }, [matchId, navigate, toast]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      // Small timeout to ensure DOM has updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [loading]);

  const handleSendMessage = async (
    e?: React.FormEvent, 
    messageType: 'text' | 'emoji' | 'gif' | 'image' = 'text',
    mediaUrl: string | null = null,
    content?: string
  ) => {
    if (e) e.preventDefault();
    
    const messageContent = content || newMessage.trim();
    if (!messageContent || !currentUser || !otherUser || !matchId) return;

    // Check and deduct credits before sending
    const hasCredits = await deductCredits();
    if (!hasCredits) {
      toast({
        title: t("chat.creditsInsufficient"),
        description: t("chat.creditsInsuffficientDescription"),
        variant: "destructive",
      });
      return;
    }

    // Crea il messaggio temporaneo per mostrarlo subito
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      match_id: matchId,
      sender_id: currentUser,
      receiver_id: otherUser.id,
      content: messageContent,
      message_type: messageType,
      media_url: mediaUrl,
      created_at: new Date().toISOString(),
      read: false,
    };

    // Aggiungi subito il messaggio alla lista locale
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          match_id: matchId,
          sender_id: currentUser,
          receiver_id: otherUser.id,
          content: messageContent,
          message_type: messageType,
          media_url: mediaUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Sostituisci il messaggio temporaneo con quello reale
      if (data) {
        setMessages((prev) => 
          prev.map(msg => msg.id === tempMessage.id ? data as Message : msg)
        );
      }
    } catch (error: any) {
      // Rimuovi il messaggio temporaneo in caso di errore
      setMessages((prev) => prev.filter(msg => msg.id !== tempMessage.id));
      
      toast({
        title: t("chat.error"),
        description: t("chat.cannotSendMessage"),
        variant: "destructive",
      });
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
  };

  const handleGifSelect = (gifUrl: string) => {
    handleSendMessage(undefined, 'gif', gifUrl, 'GIF');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      await handleSendMessage(undefined, 'image', data.publicUrl, t("chat.photo"));
      
      toast({
        title: t("chat.success"),
        description: t("chat.imageSent"),
      });
    } catch (error: any) {
      toast({
        title: t("chat.error"),
        description: t("chat.cannotUploadImage"),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">{t("chat.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <div className="container mx-auto max-w-5xl h-screen flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden shadow-xl">
          {/* Header with back button */}
          <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/")}
              className="mb-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* User Profile Section */}
          {otherUser && <ChatUserProfile userId={otherUser.id} />}
          
          {/* Messages Section */}
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-6">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === currentUser;
                  
                  return (
                    <MessageBubble
                      key={message.id}
                      content={message.content}
                      messageType={message.message_type}
                      mediaUrl={message.media_url}
                      isOwn={isOwn}
                      timestamp={message.created_at}
                      messageId={message.id}
                      senderId={message.sender_id}
                      receiverId={message.receiver_id}
                      matchId={message.match_id}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>

          {/* Input Section */}
          <div className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <form onSubmit={(e) => handleSendMessage(e)}>
              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button 
                  type="button"
                  variant="ghost" 
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="shrink-0"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                <GifPicker onGifSelect={handleGifSelect} />
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t("chat.writeMessage")}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || uploading}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Chat;