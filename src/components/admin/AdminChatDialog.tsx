import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { GifPicker } from "@/components/chat/GifPicker";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatUserProfile } from "@/components/chat/ChatUserProfile";


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
  message_type: 'text' | 'image' | 'emoji' | 'gif';
  media_url: string | null;
  created_at: string;
  read: boolean;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const initChat = async () => {
      setLoading(true);
      
      try {
        // Find or create match
        const user1 = adminProfileId < userId ? adminProfileId : userId;
        const user2 = adminProfileId < userId ? userId : adminProfileId;

        let { data: existingMatch } = await supabase
          .from("matches")
          .select("id")
          .eq("user1_id", user1)
          .eq("user2_id", user2)
          .maybeSingle();

        if (!existingMatch) {
          const { data: newMatch, error: matchError } = await supabase
            .from("matches")
            .insert({ user1_id: user1, user2_id: user2 })
            .select("id")
            .single();

          if (matchError) throw matchError;
          existingMatch = newMatch;
        }

        setMatchId(existingMatch.id);

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("match_id", existingMatch.id)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;
        setMessages((messagesData || []) as Message[]);

        // Subscribe to new messages
        const channel = supabase
          .channel(`admin-chat-${existingMatch.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `match_id=eq.${existingMatch.id}`,
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
    messageType: 'text' | 'emoji' | 'gif' | 'image' = 'text',
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
        console.log('Replacing temp message with real message:', data.message);
        setMessages((prev) =>
          prev.map(msg => msg.id === tempMessage.id ? data.message as Message : msg)
        );
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
      <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle>
            Chat: {adminNickname} ↔️ {userNickname}
          </DialogTitle>
        </DialogHeader>

        {/* User Profile */}
        <div className="px-6 pb-4 shrink-0 border-b">
          <ChatUserProfile userId={userId} currentUserId={adminProfileId} />
        </div>

        {/* Main Content: Messages only (notebooks spostati fuori) */}
        <div className="flex-1 flex px-6 py-4 min-h-0">
          <ScrollArea className="flex-1 min-h-0">
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Caricamento...</p>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === adminProfileId;
                  
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
            )}
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="border-t p-4 bg-background shrink-0">
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
                placeholder="Scrivi un messaggio..."
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
      </DialogContent>
    </Dialog>
  );
};