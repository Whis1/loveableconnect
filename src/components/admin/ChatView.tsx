import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ProfileNotebook } from "./ProfileNotebook";
import { Send, ImagePlus, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { GifPicker } from "@/components/chat/GifPicker";

interface Conversation {
  userId: string;
  userNickname: string;
  userAvatar: string | null;
  adminProfileId: string;
  adminNickname: string;
  matchId: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  message_type: "text" | "emoji" | "gif" | "image" | "voice";
  media_url: string | null;
}

interface ChatViewProps {
  conversation: Conversation | null;
  onRefresh: () => void;
}

export const ChatView = ({ conversation, onRefresh }: ChatViewProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      markAsRead();
      subscribeToMessages();
    }
  }, [conversation?.matchId]);

  const fetchMessages = async () => {
    if (!conversation) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("admin-list-messages", {
        body: { match_id: conversation.matchId },
      });

      if (error) throw error;
      setMessages(data.messages || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Errore nel caricamento dei messaggi");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!conversation) return;

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("match_id", conversation.matchId)
      .eq("receiver_id", conversation.adminProfileId);

    onRefresh();
  };

  const subscribeToMessages = () => {
    if (!conversation) return;

    const channel = supabase
      .channel(`messages_${conversation.matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${conversation.matchId}`,
        },
        () => {
          fetchMessages();
          markAsRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
        },
      });

      if (error) throw error;

      setNewMessage("");
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Errore nell'invio del messaggio");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;

    try {
      setUploading(true);
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("chat-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("chat-images").getPublicUrl(fileName);
      await handleSendMessage("", "image", data.publicUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Errore nel caricamento dell'immagine");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
    <div className="flex-1 flex">
      {/* Notebook Utente - Sinistra */}
      <div className="hidden lg:block w-64 border-r border-border bg-card/20">
        <ProfileNotebook
          profileId={conversation.userId}
          profileName={conversation.userNickname}
        />
      </div>

      {/* Chat Centrale */}
      <div className="flex-1 flex flex-col bg-background/50">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <h3 className="font-semibold text-lg">{conversation.userNickname}</h3>
          <p className="text-sm text-muted-foreground">
            Conversazione con Admin {conversation.adminNickname}
          </p>
        </div>

        {/* Messaggi */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  content={msg.content}
                  messageType={msg.message_type}
                  mediaUrl={msg.media_url}
                  isOwn={msg.sender_id === conversation.adminProfileId}
                  senderAvatarUrl={
                    msg.sender_id === conversation.userId
                      ? conversation.userAvatar
                      : null
                  }
                  timestamp={msg.created_at}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input Messaggio */}
        <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
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
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="h-4 w-4" />
              )}
            </Button>
            <EmojiPicker onEmojiSelect={(emoji) => handleSendMessage(emoji, "emoji")} />
            <GifPicker onGifSelect={(url) => handleSendMessage("", "gif", url)} />
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Scrivi un messaggio..."
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(newMessage);
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={() => handleSendMessage(newMessage)}
              disabled={!newMessage.trim()}
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
        />
      </div>
    </div>
  );
};
