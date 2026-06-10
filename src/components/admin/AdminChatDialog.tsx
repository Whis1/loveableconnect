import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Gift, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { GifPicker } from "@/components/chat/GifPicker";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ProfileNotebook } from "@/components/admin/ProfileNotebook";
import { ReportUserDialog } from "@/components/chat/ReportUserDialog";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { ProfileDialog } from "@/components/ProfileDialog";
import { AdminChatGiftPanel } from "@/components/admin/AdminChatGiftPanel";
import { parseGiftMessage } from "@/lib/chatGifts";
import { GIFT_IMAGES } from "@/lib/giftImages";


interface AdminChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminProfileId: string;
  adminNickname: string;
  userId: string;
  userNickname: string;
}

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
  admin_sender_nickname?: string | null;
}

export const AdminChatDialog = ({
  open,
  onOpenChange,
  adminProfileId,
  adminNickname,
  userId,
  userNickname,
}: AdminChatDialogProps) => {
  const { toast } = useToast();
  const [matchId, setMatchId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 🎁 Regali admin illimitati + apri profilo + blocco come profilo admin.
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  // Stato di blocco (il profilo admin ha bloccato l'utente?) a ogni apertura.
  useEffect(() => {
    if (!open) return;
    (supabase as any)
      .rpc("admin_profile_block", { p_admin_id: adminProfileId, p_user_id: userId, p_action: "get" })
      .then(({ data }: { data: boolean | null }) => setIsBlocked(Boolean(data)))
      .catch(() => setIsBlocked(false));
  }, [open, adminProfileId, userId]);

  const handleToggleBlock = async () => {
    try {
      const { data, error } = await (supabase as any).rpc("admin_profile_block", {
        p_admin_id: adminProfileId,
        p_user_id: userId,
        p_action: isBlocked ? "unblock" : "block",
      });
      if (error) throw error;
      setIsBlocked(Boolean(data));
      toast({
        title: Boolean(data) ? "Utente bloccato" : "Utente sbloccato",
        description: Boolean(data)
          ? `${adminNickname} ha bloccato ${userNickname}.`
          : `${adminNickname} ha sbloccato ${userNickname}.`,
      });
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message || "Operazione non riuscita", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!open) return;

    const initChat = async () => {
      setLoading(true);
      
      try {
        // Fetch avatars for both users
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", adminProfileId)
          .maybeSingle();
        
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", userId)
          .maybeSingle();
        
        // Convert paths to public URLs
        const adminAvatarUrl = adminProfile?.avatar_url 
          ? supabase.storage.from('profile-images').getPublicUrl(adminProfile.avatar_url).data.publicUrl
          : null;
        const userAvatarUrl = userProfile?.avatar_url
          ? supabase.storage.from('profile-images').getPublicUrl(userProfile.avatar_url).data.publicUrl
          : null;
        
        setAdminAvatar(adminAvatarUrl);
        setUserAvatar(userAvatarUrl);

        // Use edge function to find or create match (bypasses RLS)
        const { data: matchData, error: matchError } = await supabase.functions.invoke('admin-get-or-create-match', {
          body: {
            adminProfileId,
            userId,
          }
        });

        if (matchError) throw matchError;
        if (!matchData?.success || !matchData?.match_id) {
          throw new Error('Failed to get or create match');
        }

        setMatchId(matchData.match_id);

        // Fetch messages via edge function (bypasses RLS)
        const { data: listData, error: listError } = await supabase.functions.invoke('admin-list-messages', {
          body: { match_id: matchData.match_id }
        });

        if (listError || !listData?.success) {
          throw new Error(listError?.message || listData?.error || 'Failed to load messages');
        }
        setMessages(((listData.messages || []) as Message[]));

        // Subscribe to new messages
        const channel = supabase
          .channel(`admin-chat-${matchData.match_id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `match_id=eq.${matchData.match_id}`,
            },
            (payload) => {
              const newMsg = payload.new as Message;
              console.log('Realtime message payload:', newMsg);
              setMessages((prev) => {
                const exists = prev.some(m => m.id === newMsg.id);
                if (exists) return prev;
                return [...prev, newMsg];
              });
            }
          )
          .subscribe();

        setLoading(false);

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error: any) {
        console.error("Error initializing chat:", error);
        toast({
          title: "Errore",
          description: "Impossibile caricare la chat",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    initChat();
  }, [open, adminProfileId, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (
    e?: React.FormEvent,
    messageType: 'text' | 'emoji' | 'gif' | 'image' | 'voice' = 'text',
    mediaUrl: string | null = null,
    content?: string
  ) => {
    if (e) e.preventDefault();

    const messageContent = content || newMessage.trim();
    if (!messageContent || !matchId) return;

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      match_id: matchId,
      sender_id: adminProfileId,
      receiver_id: userId,
      content: messageContent,
      message_type: messageType,
      media_url: mediaUrl,
      created_at: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");

    try {
      console.log('Sending message:', { matchId, adminProfileId, userId, messageContent, messageType, mediaUrl });
      
      const { data, error } = await supabase.functions.invoke('admin-send-message', {
        body: {
          match_id: matchId,
          sender_id: adminProfileId,
          receiver_id: userId,
          content: messageContent,
          message_type: messageType,
          media_url: mediaUrl,
        }
      });

      console.log('Message response:', { data, error });

      if (error) throw error;

      // La risposta è { success: true, message: {...} }
      if (data?.success && data?.message) {
        console.log('Dedup and remove temp; rely on realtime if already present:', data.message);
        setMessages((prev) => {
          // remove temp
          const base = prev.filter(msg => msg.id !== tempMessage.id);
          // avoid duplicate if realtime already appended
          const exists = base.some(m => m.id === (data.message as Message).id);
          return exists ? base : [...base, data.message as Message];
        });
      } else {
        console.warn('Unexpected response format:', data);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages((prev) => prev.filter(msg => msg.id !== tempMessage.id));
      toast({
        title: "Errore",
        description: "Impossibile inviare il messaggio",
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

  // 🎙️ Vocali: registra → anteprima → carica su storage → invia come 'voice'.
  const [voicePreview, setVoicePreview] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);

  const handleVoiceRecording = (audioBlob: Blob) => {
    setVoicePreview(audioBlob);
    setVoicePreviewUrl(URL.createObjectURL(audioBlob));
  };

  const handleCancelVoice = () => {
    if (voicePreviewUrl) URL.revokeObjectURL(voicePreviewUrl);
    setVoicePreview(null);
    setVoicePreviewUrl(null);
  };

  const handleConfirmVoice = async () => {
    if (!voicePreview) return;
    try {
      setUploading(true);
      const fileName = `voice_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(fileName, voicePreview, { contentType: "audio/webm" });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("chat-images").getPublicUrl(fileName);
      await handleSendMessage(undefined, "voice", data.publicUrl, "Vocale");
      handleCancelVoice();
    } catch (err) {
      console.error("Error uploading voice:", err);
      toast({ title: "Errore", description: "Caricamento del vocale non riuscito", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${adminProfileId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      await handleSendMessage(undefined, 'image', data.publicUrl, 'Foto');

      toast({
        title: "Successo",
        description: "Immagine inviata",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile caricare l'immagine",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 flex flex-col">
        <div className="flex flex-1 gap-2 p-2 min-h-0">
          {/* Notebook Utente (Sinistra) - Altezza fissa con scroll interno */}
          <div className="hidden lg:block w-64 shrink-0 h-full">
            <ProfileNotebook 
              profileId={userId} 
              profileName={userNickname}
              isAdmin={false}
              adminProfileId={adminProfileId}
              matchId={matchId || ""}
            />
          </div>

          {/* Chat Centrale - Flex layout per garantire che l'input rimanga visibile */}
          <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-background min-w-0">
            <DialogHeader className="px-4 md:px-6 pt-5 pb-3 shrink-0 border-b">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <DialogTitle className="min-w-0 truncate">
                  Chat: {adminNickname} ↔️ {userNickname}
                </DialogTitle>
                {/* Azioni come nella chat utente: regalo, blocca, segnala, apri profilo */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowGiftPanel(true)}
                    className="text-primary hover:text-primary hover:bg-primary/10"
                    title="Fai un regalo (illimitato)"
                  >
                    <Gift className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleBlock}
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
                    reportedUserId={userId}
                    reportedUserName={userNickname}
                    matchId={matchId || ""}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUserProfile(true)}
                    className="gap-1.5 shrink-0 rounded-full border-primary/40 bg-primary/5 text-primary hover:bg-primary/15 hover:text-primary transition-colors"
                  >
                    <UserRound className="h-4 w-4" />
                    <span className="hidden sm:inline">Apri profilo</span>
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Messages - Flex-1 con min-h-0 per permettere lo scroll */}
            <div className="flex-1 px-3 md:px-6 py-4 min-h-0 overflow-hidden">
              <ScrollArea className="h-full">
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Caricamento...</p>
                ) : (
                  <div className="space-y-4 py-4">
                    {messages.map((message) => {
                      const isOwn = message.sender_id === adminProfileId;
                      const senderAvatar = isOwn ? adminAvatar : userAvatar;

                      // 🎁 Messaggio-regalo: bolla speciale con l'immagine.
                      const gift = parseGiftMessage(message.content);
                      if (gift) {
                        return (
                          <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} my-2`}>
                            <div className="flex flex-col items-center gap-1 rounded-2xl border border-pink-400/50 bg-gradient-to-br from-pink-500/15 via-fuchsia-500/10 to-amber-500/10 px-6 py-3 shadow-[0_4px_24px_-6px_rgba(244,114,182,0.5)]">
                              {GIFT_IMAGES[gift.id] ? (
                                <img
                                  src={GIFT_IMAGES[gift.id]}
                                  alt={gift.name}
                                  draggable={false}
                                  className="h-14 w-14 object-contain drop-shadow-[0_3px_10px_rgba(244,114,182,0.55)]"
                                />
                              ) : (
                                <span className="text-4xl leading-none">{gift.emoji}</span>
                              )}
                              <span className="text-sm font-bold bg-gradient-to-r from-pink-300 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
                                {isOwn ? `Hai regalato: ${gift.name}` : `Regalo ricevuto: ${gift.name}`}
                              </span>
                              <span className="text-[11px] font-semibold text-amber-300">{gift.cost} crediti</span>
                            </div>
                          </div>
                        );
                      }

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
                          senderNickname={
                            message.sender_id === adminProfileId 
                              ? (message.admin_sender_nickname || undefined)
                              : undefined
                          }
                          showAdminLabel={true}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Input - Sempre visibile in basso */}
            <div className="border-t p-4 bg-background shrink-0">
              {/* 🎙️ Anteprima vocale: ascolta, poi invia o annulla */}
              {voicePreview && voicePreviewUrl && (
                <div className="mb-3 p-3 bg-primary/10 rounded-lg flex items-center gap-3">
                  <audio src={voicePreviewUrl} controls className="flex-1 h-9" />
                  <Button size="sm" onClick={handleConfirmVoice} disabled={uploading}>
                    <Send className="h-4 w-4 mr-1" /> Invia
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelVoice} disabled={uploading}>
                    Annulla
                  </Button>
                </div>
              )}
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
                  <VoiceRecorder
                    onRecordingComplete={handleVoiceRecording}
                    isPremiumMonthly={true}
                    disabled={uploading || !!voicePreview}
                  />
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Scrivi un messaggio..."
                    className="flex-1"
                    disabled={!!voicePreview}
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || uploading || !!voicePreview}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Notebook Admin (Destra) - Altezza fissa con scroll interno */}
          <div className="hidden lg:block w-64 shrink-0 h-full">
            <ProfileNotebook 
              profileId={adminProfileId} 
              profileName={adminNickname}
              isAdmin={true}
              adminProfileId={adminProfileId}
              matchId={matchId || ""}
            />
          </div>
        </div>
      </DialogContent>

      {/* 🎁 Pannello regali admin (invio illimitato) */}
      {matchId && (
        <AdminChatGiftPanel
          open={showGiftPanel}
          onOpenChange={setShowGiftPanel}
          matchId={matchId}
          adminProfileId={adminProfileId}
          receiverId={userId}
          receiverNickname={userNickname}
        />
      )}

      {/* Card profilo utente (la stessa della bacheca) */}
      <ProfileDialog
        profileId={userId}
        currentUserId={adminProfileId}
        open={showUserProfile}
        onOpenChange={setShowUserProfile}
      />
    </Dialog>
  );
};