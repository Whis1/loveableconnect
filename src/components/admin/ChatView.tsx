import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { parseGiftMessage } from "@/lib/chatGifts";
import { GIFT_IMAGES } from "@/lib/giftImages";
import { ProfileNotebook } from "./ProfileNotebook";
import { ProfileDialog } from "@/components/ProfileDialog";
import { Send, ImagePlus, Loader2, MessageSquare, Info } from "lucide-react";
import { toast } from "sonner";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { GifPicker } from "@/components/chat/GifPicker";
import { VoiceRecorder } from "@/components/chat/VoiceRecorder";
import { ImagePreview } from "@/components/chat/ImagePreview";

interface Conversation {
  userId: string;
  userNickname: string;
  userAvatar: string | null;
  adminProfileId: string;
  adminNickname: string;
  matchId: string;
  lastMessageAt: string;
  unreadCount: number;
  userCity?: string | null;
  userLatitude?: number | null;
  userLongitude?: number | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  message_type: "text" | "emoji" | "gif" | "image" | "voice";
  media_url: string | null;
  admin_sender_nickname?: string | null;
}

interface ChatViewProps {
  conversation: Conversation | null;
  currentAdminId?: string;
  onRefresh: () => void;
  chattorsNickname?: string;
}

export const ChatView = ({ conversation, currentAdminId, onRefresh, chattorsNickname }: ChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [voicePreview, setVoicePreview] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ file: File; url: string } | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showAdminProfile, setShowAdminProfile] = useState(false);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tiene traccia dell'ultima conversazione per cui abbiamo gia' scrollato:
  // distingue "apertura nuova chat" (salto istantaneo) da "nuovo messaggio"
  // (scroll morbido).
  const scrolledMatchRef = useRef<string | null>(null);

  // Converte un path dello storage in URL pubblico (gli avatar sono salvati come
  // path tipo "<id>/avatar-xxx.jpg"; se gia' http lo lascia com'e').
  const getAvatarUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    return supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl;
  };

  useEffect(() => {
    if (!conversation) return;
    fetchMessages();
    markAsRead();
    fetchAdminAvatar();
    const unsubscribe = subscribeToMessages();
    return () => {
      unsubscribe?.();
    };
  }, [conversation?.matchId]);

  // Posizionamento in fondo. All'APERTURA di una chat saltiamo subito all'ultimo
  // messaggio in modo ISTANTANEO (useLayoutEffect = prima che il browser
  // disegni, quindi nessuna animazione visibile). Per i messaggi che arrivano
  // mentre la chat e' gia' aperta usiamo invece uno scroll morbido.
  useLayoutEffect(() => {
    if (!conversation || messages.length === 0) return;
    const isNewConversation = scrolledMatchRef.current !== conversation.matchId;
    scrolledMatchRef.current = conversation.matchId;
    scrollToBottom(isNewConversation ? "auto" : "smooth");
  }, [messages, conversation?.matchId]);

  // Segna i messaggi come letti OGNI volta che la lista messaggi cambia mentre
  // la chat e' aperta. Copre in modo uniforme tutti i casi: caricamento
  // iniziale, consegna realtime E polling di backup. Senza questo, un messaggio
  // arrivato via polling (quando il realtime non si connette) restava "non
  // letto" nel DB e il badge "1" riappariva al refresh anche dopo averlo letto.
  // E' idempotente: la edge function aggiorna solo le righe con read=false.
  useEffect(() => {
    if (!conversation || messages.length === 0) return;
    markAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, conversation?.matchId]);

  // Fallback realtime: ricontrolla i messaggi ogni secondo, così i nuovi
  // messaggi compaiono quasi istantaneamente anche se la consegna in tempo
  // reale non funziona (i chattors usano la chiave anon e il realtime
  // postgres_changes non viene consegnato all'anon per via dell'RLS).
  useEffect(() => {
    if (!conversation) return;
    const matchId = conversation.matchId;
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("admin-list-messages", {
          body: { match_id: matchId },
        });
        if (error || !data) return;
        const server = (data.messages || []) as Message[];
        setMessages((prev) => {
          // Nessun cambiamento: mantieni lo stato attuale (evita re-render/scroll).
          if (
            server.length === prev.length &&
            server[server.length - 1]?.id === prev[prev.length - 1]?.id
          ) {
            return prev;
          }
          return server;
        });
      } catch {
        // ignora errori temporanei del polling
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [conversation?.matchId]);

  const fetchMessages = async () => {
    if (!conversation) return;

    try {
      const { data, error } = await supabase.functions.invoke("admin-list-messages", {
        body: { match_id: conversation.matchId },
      });

      if (error) throw error;
      setMessages(data.messages || []);
      // Lo scroll iniziale e' gestito dal useLayoutEffect (salto istantaneo).
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Errore nel caricamento dei messaggi");
    }
  };

  // Recupera l'avatar del profilo admin per mostrarlo nei suoi messaggi.
  const fetchAdminAvatar = async () => {
    if (!conversation) return;
    setAdminAvatar(null);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, photos")
        .eq("id", conversation.adminProfileId)
        .maybeSingle();
      const path =
        (data?.avatar_url as string | null) ||
        (Array.isArray(data?.photos) ? (data?.photos[0] as string) : null) ||
        null;
      setAdminAvatar(getAvatarUrl(path) ?? null);
    } catch {
      // se non riusciamo a recuperarlo, resta l'icona di fallback
    }
  };

  const markAsRead = async () => {
    if (!conversation) return;

    try {
      // RPC veloce e affidabile. Se non e' installata, fallback alla edge function.
      const { error } = await (supabase as any).rpc("mark_conversation_read", {
        p_match_id: conversation.matchId,
        p_user_id: conversation.userId,
      });
      if (error) {
        await supabase.functions.invoke("admin-mark-messages-read", {
          body: {
            match_id: conversation.matchId,
            admin_profile_id: conversation.adminProfileId,
            user_id: conversation.userId,
          },
        });
      }
    } catch (err) {
      console.error("Errore nel segnare come letti:", err);
    } finally {
      onRefresh();
    }
  };

  const subscribeToMessages = () => {
    if (!conversation) return;

    const channel = supabase
      .channel(`messages_${conversation.matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${conversation.matchId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Dedup: evita doppioni se lo stesso messaggio arriva anche dal
          // polling di backup. markAsRead viene gestito dall'effect su [messages].
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          );
          // Lo scroll e' gestito dal useLayoutEffect su [messages].
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  const handleSendMessage = async (content: string, type: "text" | "emoji" | "gif" | "image" | "voice" = "text", mediaUrl: string | null = null) => {
    if (!conversation || (!content.trim() && !mediaUrl)) return;

    try {
      const { error } = await supabase.functions.invoke("admin-send-message", {
        body: {
          match_id: conversation.matchId,
          sender_id: conversation.adminProfileId,
          receiver_id: conversation.userId,
          content: content || "",
          message_type: type,
          media_url: mediaUrl,
          admin_secondary_nickname: chattorsNickname,
        },
      });

      if (error) throw error;

      setNewMessage("");
      await fetchMessages();
      // Lo scroll verso il basso e' gestito dal useLayoutEffect su [messages].
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Errore nell'invio del messaggio");
    }
  };

  // Mostra l'anteprima di un'immagine prima dell'invio (input file o PASTE Ctrl+V).
  const queueImage = (file: File) => {
    if (!file || !conversation) return;
    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file) };
    });
  };

  // Carica ed invia l'immagine attualmente in anteprima.
  const sendPendingImage = async () => {
    if (!pendingImage || !conversation) return;
    const { file } = pendingImage;
    try {
      setUploading(true);
      // Nome sicuro: se incolli, file.name puo' essere vuoto/strano → usa estensione dal type.
      const ext = (file.type && file.type.includes("/")) ? file.type.split("/")[1] : "png";
      const safeName = file.name && file.name.trim() ? file.name : `pasted_${Date.now()}.${ext}`;
      const fileName = `${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("chat-images").getPublicUrl(fileName);
      await handleSendMessage("", "image", data.publicUrl);

      URL.revokeObjectURL(pendingImage.url);
      setPendingImage(null);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Errore nel caricamento dell'immagine");
    } finally {
      setUploading(false);
    }
  };

  // Annulla l'immagine in anteprima senza inviarla.
  const cancelPendingImage = () => {
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.url);
      setPendingImage(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) queueImage(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Incolla un'immagine dagli appunti (Ctrl+V): mostra l'anteprima, non invia subito.
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault(); // non incollare il testo/nome del file
          queueImage(file);
          break;
        }
      }
    }
  };

  const handleVoiceRecording = (audioBlob: Blob) => {
    // Crea URL temporaneo per l'anteprima
    const url = URL.createObjectURL(audioBlob);
    setVoicePreview(audioBlob);
    setVoicePreviewUrl(url);
  };

  const handleConfirmVoice = async () => {
    if (!conversation || !voicePreview) return;

    try {
      setUploading(true);
      const fileName = `voice_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(fileName, voicePreview, {
          contentType: "audio/webm",
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("chat-images").getPublicUrl(fileName);
      await handleSendMessage("", "voice", data.publicUrl);
      
      // Pulisci l'anteprima
      handleCancelVoice();
    } catch (error) {
      console.error("Error uploading voice:", error);
      toast.error("Errore nel caricamento del messaggio vocale");
    } finally {
      setUploading(false);
    }
  };

  const handleCancelVoice = () => {
    if (voicePreviewUrl) {
      URL.revokeObjectURL(voicePreviewUrl);
    }
    setVoicePreview(null);
    setVoicePreviewUrl(null);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            Seleziona una conversazione per iniziare
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex-1 flex">
      {/* Notebook Utente - Sinistra */}
      <div className="hidden lg:block w-64 border-r border-border bg-card/20">
        <ProfileNotebook
          profileId={conversation.userId}
          profileName={conversation.userNickname}
          adminProfileId={conversation.adminProfileId}
          matchId={conversation.matchId}
        />
      </div>

      {/* Chat Centrale */}
      <div className="flex-1 flex flex-col bg-background/50">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{conversation.userNickname}</h3>
              {/* Location info for admin secondaries */}
              {(conversation.userCity || conversation.userLatitude || conversation.userLongitude) && (
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {conversation.userCity && (
                    <p>📍 {conversation.userCity}</p>
                  )}
                  {conversation.userLatitude && conversation.userLongitude && (
                    <p className="font-mono">
                      {conversation.userLatitude.toFixed(6)}, {conversation.userLongitude.toFixed(6)}
                    </p>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowUserProfile(true)}
                className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
              >
                <Info className="h-3 w-3" />
                Info profilo
              </button>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Admin {conversation.adminNickname}</p>
              <button
                onClick={() => setShowAdminProfile(true)}
                className="text-xs text-primary hover:underline flex items-center gap-1 justify-end mt-0.5"
              >
                <Info className="h-3 w-3" />
                Info profilo
              </button>
            </div>
          </div>
        </div>

        {/* Messaggi */}
        <ScrollArea className="flex-1 p-4 bg-gradient-to-br from-fuchsia-50 via-white to-purple-50 dark:from-[#1e1430] dark:via-[#171022] dark:to-[#241430]">
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === conversation.adminProfileId;

              // 🎁 Messaggio-regalo: bolla speciale con l'immagine (come in chat
              //    utente), al posto del testo grezzo "[gift:...]".
              const gift = parseGiftMessage(msg.content);
              if (gift) {
                return (
                  <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} my-2`}>
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
                  key={msg.id}
                  content={msg.content}
                  messageType={msg.message_type}
                  mediaUrl={msg.media_url}
                  isOwn={isOwn}
                  senderAvatarUrl={
                    isOwn
                      ? adminAvatar
                      : getAvatarUrl(conversation.userAvatar) ?? null
                  }
                  timestamp={msg.created_at}
                  senderNickname={
                    isOwn
                      ? (msg.admin_sender_nickname || undefined)
                      : undefined
                  }
                  showAdminLabel={true}
                  sideLayout
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Messaggio */}
        <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
          {/* Anteprima Vocale */}
          {voicePreview && voicePreviewUrl && (
            <div className="mb-3 p-3 bg-primary/10 rounded-lg flex items-center gap-3">
              <audio controls src={voicePreviewUrl} className="flex-1" />
              <Button
                variant="default"
                size="sm"
                onClick={handleConfirmVoice}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancelVoice}
                disabled={uploading}
              >
                ✕
              </Button>
            </div>
          )}

          {/* Anteprima Immagine */}
          {pendingImage && (
            <div className="mb-3">
              <ImagePreview
                imageUrl={pendingImage.url}
                onSend={sendPendingImage}
                onDelete={cancelPendingImage}
                sending={uploading}
              />
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !!voicePreview || !!pendingImage}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </Button>
            <EmojiPicker onEmojiSelect={(emoji) => handleSendMessage(emoji, "emoji")} />
            <GifPicker onGifSelect={(url) => handleSendMessage("", "gif", url)} />
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecording}
              isPremiumMonthly={true}
              disabled={uploading || !!voicePreview || !!pendingImage}
            />
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Scrivi un messaggio..."
              onPaste={handlePaste}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(newMessage);
                }
              }}
              className="flex-1"
              disabled={!!voicePreview || !!pendingImage}
            />
            <Button
              onClick={() => handleSendMessage(newMessage)}
              disabled={!newMessage.trim() || !!voicePreview || !!pendingImage}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Notebook Admin - Destra */}
      <div className="hidden lg:block w-64 border-l border-border bg-card/20">
        <ProfileNotebook
          profileId={conversation.adminProfileId}
          profileName={conversation.adminNickname}
          isAdmin
          adminProfileId={currentAdminId || conversation.adminProfileId}
          matchId={conversation.matchId}
        />
      </div>
    </div>

    {/* Profile Dialogs */}
    <ProfileDialog
      profileId={conversation.userId}
      currentUserId={currentAdminId || conversation.adminProfileId}
      open={showUserProfile}
      onOpenChange={setShowUserProfile}
    />
    <ProfileDialog
      profileId={conversation.adminProfileId}
      currentUserId={currentAdminId || conversation.adminProfileId}
      open={showAdminProfile}
      onOpenChange={setShowAdminProfile}
    />
    </>
  );
};
