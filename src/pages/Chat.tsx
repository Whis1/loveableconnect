import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Paperclip, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { GifPicker } from "@/components/chat/GifPicker";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatUserProfile } from "@/components/chat/ChatUserProfile";
import { InsufficientCreditsBanner } from "@/components/chat/InsufficientCreditsBanner";
import { useCredits } from "@/hooks/useCredits";
import { useTranslation } from "react-i18next";
import OnlineIndicator from "@/components/OnlineIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  translatedContent?: string;
}

interface Profile {
  id: string;
  full_name: string;
  nickname: string;
  is_admin_profile: boolean;
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
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { deductCredits } = useCredits();
  const [showCreditsBanner, setShowCreditsBanner] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initChat = async () => {
      console.log('[Chat] initChat start', { matchId });
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

      // Load current user's avatar
      try {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();
        
        // Convert path to public URL
        const myAvatarUrl = myProfile?.avatar_url
          ? supabase.storage.from('profile-images').getPublicUrl(myProfile.avatar_url).data.publicUrl
          : null;
        setMyAvatar(myAvatarUrl);
      } catch (e) {
        console.warn('[Chat] Could not load my avatar', e);
      }

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
        .select("id, full_name, nickname, is_admin_profile, avatar_url")
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

      // Convert avatar path to public URL
      const profileWithPublicAvatar = {
        ...profile,
        avatar_url: profile.avatar_url
          ? supabase.storage.from('profile-images').getPublicUrl(profile.avatar_url).data.publicUrl
          : null
      };

      setOtherUser(profileWithPublicAvatar);

      // Fetch messages
      const { data: messagesData } = await supabase
        .from("messages")
        .select("*")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });

      // Use original messages without translation
      const originalMessages = messagesData || [];

      setMessages(originalMessages as Message[]);

      // Mark messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("match_id", matchId)
        .eq("receiver_id", session.user.id)
        .eq("read", false);

      setLoading(false);

      // Subscribe to new messages with realtime
      channel = supabase
        .channel(`messages-${matchId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `match_id=eq.${matchId}`,
          },
          async (payload) => {
            const newMsg = payload.new as Message;
            console.log('[Chat] Realtime INSERT', newMsg);
            
            // Append new message as-is (no translation)
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
        .subscribe((status) => {
          console.log('[Chat] Channel status:', status);
        });
    };

    initChat();

    return () => {
      if (channel) {
        console.log('[Chat] removing channel');
        supabase.removeChannel(channel);
      }
    };
  }, [matchId, navigate, toast, t]);

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
      setShowCreditsBanner(true);
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
      <InsufficientCreditsBanner 
        isVisible={showCreditsBanner} 
        onClose={() => setShowCreditsBanner(false)} 
      />
      <div className="container mx-auto max-w-2xl h-screen flex flex-col p-2 md:p-4">
        <Card className="flex-1 flex flex-col overflow-hidden shadow-xl">
          {/* Header with back button */}
          <div className="border-b p-3 md:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate("/matches")}
                  className="shrink-0 h-9 w-9 md:h-10 md:w-10"
                >
                  <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                {otherUser && (
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <Avatar className="h-9 w-9 md:h-10 md:w-10">
                        <AvatarImage src={otherUser.avatar_url || undefined} />
                        <AvatarFallback>
                          {otherUser.nickname.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0">
                        <OnlineIndicator userId={otherUser.id} size="sm" />
                      </div>
                    </div>
                    <span className="font-semibold text-sm md:text-base truncate">
                      {otherUser.nickname}
                    </span>
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowProfile(!showProfile)}
                className="gap-1 md:gap-2 shrink-0"
              >
                {showProfile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="hidden sm:inline">{showProfile ? t("chat.hideProfile") : t("chat.showProfile")}</span>
              </Button>
            </div>
          </div>

          {/* User Profile Section */}
          {otherUser && showProfile && <ChatUserProfile userId={otherUser.id} />}
          
          {/* Messages Section */}
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full p-3 md:p-6">
              <div className="space-y-3 md:space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === currentUser;
                  const senderAvatar = isOwn ? myAvatar : otherUser?.avatar_url || null;
                  
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
                      senderAvatarUrl={senderAvatar}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </CardContent>

          {/* Input Section */}
          <div className="border-t p-2 md:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <form onSubmit={(e) => handleSendMessage(e)}>
              <div className="flex gap-1 md:gap-2 items-center">
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
                  className="shrink-0 h-9 w-9 md:h-10 md:w-10"
                >
                  <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                <GifPicker onGifSelect={handleGifSelect} />
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t("chat.writeMessage")}
                  className="flex-1 text-sm md:text-base"
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || uploading}
                  className="shrink-0 h-9 w-9 md:h-10 md:w-10"
                  size="icon"
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