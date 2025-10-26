import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, Image as ImageIcon, X, Bot } from "lucide-react";
import { AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";

interface SupportMessage {
  id: string;
  user_id: string;
  user_email: string;
  message: string;
  is_admin_response: boolean;
  created_at: string;
  read: boolean;
  image_url?: string;
}

interface SupportChatProps {
  userEmail: string;
}

export const SupportChat = ({ userEmail }: SupportChatProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('support-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
        },
        (payload) => {
          console.log('New support message:', payload);
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t("support.error"),
          description: t("support.errorImageSize"),
          variant: "destructive",
        });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = async (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        event.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            toast({
              title: t("support.error"),
              description: t("support.errorImageSize"),
              variant: "destructive",
            });
            return;
          }
          setSelectedImage(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('support-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('support-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: t("support.error"),
          description: t("support.errorLogin"),
          variant: "destructive",
        });
        return;
      }

      const isFirstMessage = messages.length === 0;
      let imageUrl: string | null = null;

      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage, user.id);
        if (!imageUrl) {
          toast({
            title: t("support.error"),
            description: t("support.errorUploadImage"),
            variant: "destructive",
          });
          return;
        }
      }

      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          user_email: userEmail,
          message: newMessage || t("support.imageLabel"),
          is_admin_response: false,
          image_url: imageUrl,
        });

      if (error) throw error;

      // Se è il primo messaggio, invia un messaggio automatico di risposta
      if (isFirstMessage) {
        setTimeout(async () => {
          await supabase
            .from('support_messages')
            .insert({
              user_id: user.id,
              user_email: userEmail,
              message: t("support.autoResponse"),
              is_admin_response: true,
            });
        }, 1000);
      }

      setNewMessage("");
      removeImage();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: t("support.error"),
        description: t("support.errorSendMessage"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-2xl bg-background/95 backdrop-blur-md h-[600px] flex flex-col max-w-2xl mx-auto">
      <CardHeader className="border-b bg-primary/5 pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t("support.chatTitle")}</h3>
            <p className="text-sm text-muted-foreground font-normal">{t("support.chatSubtitle")}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4 py-6">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  {t("support.startConversation")}
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                // Check if it's the automatic bot response
                const isAutomaticBotMessage = msg.is_admin_response && 
                  (msg.message.includes(t("support.autoResponse")) || 
                   msg.message.includes("Il supporto clienti ti assisterà"));
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.is_admin_response ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                  >
                    {!msg.is_admin_response && (
                      <Avatar className="h-9 w-9 border-2 border-primary/20 flex-shrink-0">
                        <AvatarFallback className="bg-secondary text-secondary-foreground font-semibold">
                          {t("support.you")}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm break-words ${
                        msg.is_admin_response
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : 'bg-muted rounded-tl-sm'
                      }`}
                    >
                      {msg.is_admin_response && (
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {isAutomaticBotMessage ? 'Bot' : 'Supporto Clienti'}
                        </p>
                      )}
                      {msg.image_url && (
                        <img 
                          src={msg.image_url} 
                          alt="Immagine allegata" 
                          className="rounded-lg max-w-[280px] max-h-64 object-cover mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.image_url, '_blank')}
                        />
                      )}
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      <p className="text-xs opacity-60 mt-1.5">
                        {new Date(msg.created_at).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {msg.is_admin_response && (
                      <Avatar className="h-9 w-9 border-2 border-primary/20 flex-shrink-0 overflow-hidden">
                        {isAutomaticBotMessage ? (
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                            <Bot className="h-5 w-5" />
                          </AvatarFallback>
                        ) : (
                          <>
                            <AvatarImage 
                              src="/images/support-avatar.png" 
                              alt="Supporto Clienti"
                              className="object-cover w-full h-full"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                              SC
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                    )}
                </div>
              );
            })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t bg-background/50 p-4">
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img 
                src={imagePreview} 
                alt="Anteprima" 
                className="max-h-32 rounded-lg border-2 border-primary/20"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={removeImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="rounded-full h-10 w-10 shrink-0"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              placeholder={t("support.typeMessage")}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !loading && handleSendMessage()}
              onPaste={handlePaste}
              disabled={loading}
              className="flex-1 rounded-full border-2 focus-visible:ring-primary"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={loading || (!newMessage.trim() && !selectedImage)}
              size="icon"
              className="rounded-full h-10 w-10 shadow-md shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};