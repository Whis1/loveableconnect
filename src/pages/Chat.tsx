import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Paperclip, ChevronDown, ChevronUp, Gift } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { GifPicker } from "@/components/chat/GifPicker";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { VoicePreview } from "@/components/chat/VoicePreview";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatUserProfile } from "@/components/chat/ChatUserProfile";
import { InsufficientCreditsBanner } from "@/components/chat/InsufficientCreditsBanner";
import { VoicePremiumBanner } from "@/components/chat/VoicePremiumBanner";
import { ReportUserDialog } from "@/components/chat/ReportUserDialog";
import { GiftSubscriptionBanner } from "@/components/chat/GiftSubscriptionBanner";
import { useCredits } from "@/hooks/useCredits";
import { useTranslation } from "@/hooks/useTranslation";
import OnlineIndicator from "@/components/OnlineIndicator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'emoji' | 'gif' | 'voice';
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
  const { deductCredits, credits } = useCredits();
  const [showCreditsBanner, setShowCreditsBanner] = useState(false);
  const [showVoicePremiumBanner, setShowVoicePremiumBanner] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const [giftingSubscription, setGiftingSubscription] = useState(false);
  const [showGiftBanner, setShowGiftBanner] = useState(false);

  // Check for gift payment result in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    // Verifica automaticamente il regalo se c'è un session_id
    const verifyGiftPayment = async (sessionId: string) => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-gift-subscription', {
          body: { session_id: sessionId }
        });

        if (error) throw error;

        if (data?.success) {
          toast({
            title: "🎁 Regalo inviato!",
            description: "L'abbonamento Premium è stato regalato con successo!",
          });
        }
      } catch (error: any) {
        console.error("Error verifying gift:", error);
        toast({
          title: "Errore",
          description: "Impossibile verificare il pagamento del regalo",
          variant: "destructive",
        });
      } finally {
        // Remove params from URL
        urlParams.delete('session_id');
        urlParams.delete('gift_success');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
      }
    };

    if (sessionId && urlParams.get('gift_success') === 'true') {
      verifyGiftPayment(sessionId);
    } else if (urlParams.get('gift_cancelled') === 'true') {
      toast({
        title: "Regalo annullato",
        description: "Il pagamento è stato annullato",
        variant: "destructive",
      });
      // Remove the param from URL
      urlParams.delete('gift_cancelled');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [toast]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const checkBlockStatus = async (userId: string, otherUserId: string) => {
      const { data, error } = await supabase
        .from("blocked_users")
        .select("id")
        .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`)
        .maybeSingle();

      if (!error && data) {
        setIsBlocked(true);
      }
    };

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

      // Verifica se l'utente è bloccato
      await checkBlockStatus(session.user.id, otherUserId);

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
    messageType: 'text' | 'emoji' | 'gif' | 'image' | 'voice' = 'text',
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

  const handleVoiceRecording = async (audioBlob: Blob) => {
    // Create a URL for preview
    const audioUrl = URL.createObjectURL(audioBlob);
    setRecordedAudio({ blob: audioBlob, url: audioUrl });
  };

  const handleSendVoiceMessage = async () => {
    if (!currentUser || !recordedAudio) return;

    setUploading(true);
    try {
      const fileName = `${currentUser}/${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, recordedAudio.blob, {
          contentType: 'audio/webm'
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      await handleSendMessage(undefined, 'voice', data.publicUrl, '🎤 Messaggio vocale');
      
      // Clean up
      URL.revokeObjectURL(recordedAudio.url);
      setRecordedAudio(null);
    } catch (error: any) {
      console.error("Error uploading voice message:", error);
      toast({
        title: t("chat.error"),
        description: "Impossibile inviare il messaggio vocale",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVoiceMessage = () => {
    if (recordedAudio) {
      URL.revokeObjectURL(recordedAudio.url);
      setRecordedAudio(null);
    }
  };

  const handleBlock = async () => {
    if (!currentUser || !otherUser) return;
    
    try {
      const { error } = await supabase
        .from("blocked_users")
        .insert({
          blocker_id: currentUser,
          blocked_id: otherUser.id,
        });

      if (error && error.code !== "23505") {
        throw error;
      }

      setIsBlocked(true);
      toast({
        title: "Utente bloccato",
        description: "Non potrete più scrivervi messaggi",
      });
    } catch (error: any) {
      console.error("Errore nel blocco:", error);
      toast({
        title: "Errore",
        description: "Impossibile bloccare l'utente",
        variant: "destructive",
      });
    }
  };

  const handleUnblock = async () => {
    if (!currentUser || !otherUser) return;
    
    try {
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .or(`and(blocker_id.eq.${currentUser},blocked_id.eq.${otherUser.id}),and(blocker_id.eq.${otherUser.id},blocked_id.eq.${currentUser})`);

      if (error) throw error;

      setIsBlocked(false);
      toast({
        title: "Utente sbloccato",
        description: "Potete scrivervi nuovamente messaggi",
      });
    } catch (error: any) {
      console.error("Errore nello sblocco:", error);
      toast({
        title: "Errore",
        description: "Impossibile sbloccare l'utente",
        variant: "destructive",
      });
    }
  };

  const handleShowGiftBanner = () => {
    setShowGiftBanner(true);
  };

  const handleConfirmGift = async () => {
    if (!otherUser || !currentUser || !matchId) return;

    setGiftingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke('gift-subscription', {
        body: { 
          recipient_id: otherUser.id,
          match_id: matchId 
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Chiudi il banner prima di aprire Stripe
        setShowGiftBanner(false);
        window.open(data.url, '_blank');
        toast({
          title: "Pagamento in corso",
          description: `Stai per regalare Premium a ${otherUser.nickname}`,
        });
      }
    } catch (error: any) {
      console.error("Errore nel regalo abbonamento:", error);
      toast({
        title: "Errore",
        description: "Impossibile avviare il regalo dell'abbonamento",
        variant: "destructive",
      });
    } finally {
      setGiftingSubscription(false);
    }
  };

  const handleCancelGift = () => {
    setShowGiftBanner(false);
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
      {showGiftBanner && otherUser && (
        <GiftSubscriptionBanner
          recipientNickname={otherUser.nickname}
          onConfirm={handleConfirmGift}
          onCancel={handleCancelGift}
          isProcessing={giftingSubscription}
        />
      )}
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
              <div className="flex items-center gap-1">
                {otherUser && matchId && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShowGiftBanner}
                      disabled={giftingSubscription}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      title="Regala abbonamento Premium"
                    >
                      <Gift className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={isBlocked ? handleUnblock : handleBlock}
                      className={isBlocked ? "text-green-600 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900" : "text-destructive hover:text-destructive hover:bg-destructive/10"}
                      title={isBlocked ? "Sblocca utente" : "Blocca utente"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        {isBlocked ? (
                          <>
                            <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
                            <path d="M12 16v1"/>
                            <path d="M12 13v1"/>
                            <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                          </>
                        ) : (
                          <>
                            <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
                            <path d="M12 16v1"/>
                            <path d="M12 13v1"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </>
                        )}
                      </svg>
                    </Button>
                    <ReportUserDialog
                      reportedUserId={otherUser.id}
                      reportedUserName={otherUser.nickname}
                      matchId={matchId}
                    />
                  </>
                )}
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
          <div className="border-t p-2 md:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 space-y-2">
            {recordedAudio && (
              <VoicePreview
                audioUrl={recordedAudio.url}
                onSend={handleSendVoiceMessage}
                onDelete={handleDeleteVoiceMessage}
              />
            )}
            {isBlocked ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Non puoi più inviare messaggi a questo utente
                </p>
              </div>
            ) : (
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
                    disabled={uploading || !!recordedAudio}
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
                    disabled={!!recordedAudio}
                  />
                  <VoiceRecorder 
                    onRecordingComplete={handleVoiceRecording}
                    disabled={uploading || !!recordedAudio}
                    isPremiumMonthly={credits?.is_premium && credits.subscription_type === 'monthly'}
                    onPremiumRequired={() => setShowVoicePremiumBanner(true)}
                  />
                  <Button 
                    type="submit" 
                    disabled={!newMessage.trim() || uploading || !!recordedAudio}
                    className="shrink-0 h-9 w-9 md:h-10 md:w-10"
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>

      <VoicePremiumBanner 
        isVisible={showVoicePremiumBanner}
        onClose={() => setShowVoicePremiumBanner(false)}
      />
    </div>
  );
};

export default Chat;