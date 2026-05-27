import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, Image as ImageIcon, X, Bot, Headphones, MapPin, Calendar, Paperclip, FileText } from "lucide-react";
import { AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { LinkifiedText } from "@/lib/linkify";
import { downloadRemoteFile } from "@/lib/download";

interface SupportMessage {
  id: string;
  user_id: string;
  user_email: string;
  message: string;
  is_admin_response: boolean;
  created_at: string;
  read: boolean;
  image_url?: string;
  file_url?: string;
  file_name?: string;
  admin_id?: string | null;
  request_type?: string;
  request_status?: string;
  request_data?: any;
}

interface SupportChatProps {
  userEmail: string;
  isLocationChangeRequest?: boolean;
  newLocationData?: { city: string; latitude: number; longitude: number };
  isBirthdateChangeRequest?: boolean;
  newBirthdateData?: { birthdate: string };
}

export const SupportChat = ({ userEmail, isLocationChangeRequest, newLocationData, isBirthdateChangeRequest, newBirthdateData }: SupportChatProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // 📎 File generici (PDF, ZIP, DOC, ...) oltre alle immagini
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // 📛 Mappa admin_id → display_name per mostrare "Aldo - Supporto Clienti"
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [requestSent, setRequestSent] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);

  // Inizializza e osserva lo stato di autenticazione per evitare race condition
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted) setUserId(user?.id ?? null);
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setUserId(session?.user?.id ?? null);
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Invia automaticamente la richiesta di cambio location o birthdate quando l'utente è pronto
  useEffect(() => {
    if (!userId) return; // aspetta che l'auth sia pronta
    if (!requestSent) {
      if (isLocationChangeRequest && newLocationData) {
        sendLocationChangeRequest();
      } else if (isBirthdateChangeRequest && newBirthdateData) {
        sendBirthdateChangeRequest();
      }
    }
  }, [userId, isLocationChangeRequest, newLocationData, isBirthdateChangeRequest, newBirthdateData, requestSent]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 📎 Ref separato per il file picker generico (non immagini)
  const fileGenericInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Senza userId non possiamo né fetchare né sottoscriverci con filter.
    if (!userId) return;

    fetchMessages();

    // 🔔 Subscribe filtrato per user_id: più affidabile rispetto al wildcard
    // perché Supabase Realtime sotto carico tende a droppare eventi quando
    // il channel non ha filter. Channel name unico per evitare collisioni
    // con altre istanze del componente o ri-mount.
    const channel = supabase
      .channel(`support-messages-${userId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New support message (realtime):', payload);
          fetchMessages();
        }
      )
      .subscribe();

    // 🔁 Polling fallback ogni 4s: se il realtime droppa l'evento dell'admin
    // (problema noto Supabase con multi-channel), il messaggio arriva comunque.
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 4000);

    // 👁️ Refresh quando la tab torna visibile o riceve focus.
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchMessages();
    };
    const onFocus = () => fetchMessages();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);

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
      const newMessages = (data || []) as SupportMessage[];

      // 📛 Carica i display_name degli admin che hanno risposto in questa
      // conversazione. Permette di mostrare "Aldo - Supporto Clienti".
      const adminIds = Array.from(
        new Set(
          newMessages
            .map((m) => m.admin_id)
            .filter(Boolean) as string[]
        )
      );
      const missing = adminIds.filter((id) => !adminNames[id]);
      if (missing.length > 0) {
        try {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("user_id, display_name")
            .in("user_id", missing);
          if (roles && roles.length > 0) {
            setAdminNames((prev) => {
              const next = { ...prev };
              (roles as any[]).forEach((r) => {
                if (r.display_name) next[r.user_id] = r.display_name;
              });
              return next;
            });
          }
        } catch (e) {
          // Se RLS blocca SELECT su user_roles, fallback silenzioso:
          // il messaggio resterà come "Supporto Clienti".
          console.warn("Could not load admin names:", e);
        }
      }

      // 🚀 Update solo se cambiato (evita re-render inutili dal polling 4s).
      // Confrontiamo lunghezza + ultimo ID + ultimo updated_at-like (created_at).
      setMessages((prev) => {
        if (prev.length !== newMessages.length) return newMessages;
        if (prev.length === 0) return newMessages;
        const lastPrev = prev[prev.length - 1];
        const lastNew = newMessages[newMessages.length - 1];
        if (
          lastPrev.id !== lastNew.id ||
          lastPrev.message !== lastNew.message ||
          lastPrev.request_status !== lastNew.request_status
        ) {
          return newMessages;
        }
        // Nessun cambiamento sostanziale → mantieni il riferimento per evitare re-render.
        return prev;
      });
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

  // 📎 Handler per file generici (PDF, ZIP, DOC, ...) — limit 10MB
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t("support.error"),
          description: "Il file è troppo grande (max 10MB)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileGenericInputRef.current) {
      fileGenericInputRef.current.value = '';
    }
  };

  const uploadFile = async (
    file: File,
    userId: string
  ): Promise<{ url: string; name: string; error?: string } | null> => {
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${userId}/${Date.now()}-${sanitized}`;

    // 1) Tenta bucket dedicato `support-files`
    let bucket = 'support-files';
    let path = fileName;
    let { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file);

    // 2) Fallback su `support-images` se il bucket dedicato non esiste ancora
    //    (utile se la migration SQL non è stata applicata)
    if (uploadError) {
      console.warn('[uploadFile] support-files failed:', uploadError);
      const msg = String((uploadError as any)?.message || '').toLowerCase();
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('bucket')) {
        bucket = 'support-images';
        path = `files/${fileName}`;
        const fb = await supabase.storage.from(bucket).upload(path, file);
        uploadError = fb.error;
        if (!uploadError) {
          console.warn('[uploadFile] fallback su support-images ok');
        }
      }
    }

    if (uploadError) {
      console.error('Upload file error (final):', uploadError);
      return { url: '', name: file.name, error: (uploadError as any).message };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, name: file.name };
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

  const sendLocationChangeRequest = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !newLocationData) return;

      const messageText = `🗺️ Richiesta cambio location\n\nVorrei cambiare la mia location in: ${newLocationData.city}`;

      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          user_email: userEmail || user.email,
          message: messageText,
          is_admin_response: false,
          request_type: 'location_change',
          request_status: 'pending',
          request_data: newLocationData,
        });

      if (error) throw error;
      setRequestSent(true);

      // Messaggio automatico di conferma
      setTimeout(async () => {
        await supabase
          .from('support_messages')
            .insert({
              user_id: user.id,
              user_email: userEmail || user.email,
              message: "📍 Grazie per la tua richiesta di cambio location. Il nostro team la esaminerà al più presto e ti farà sapere se potrà essere approvata.",
              is_admin_response: true,
            });
      }, 500);

      toast({
        title: "✅ Richiesta inviata",
        description: `Richiesta di cambio location a "${newLocationData.city}" inviata con successo`,
      });

      // Refresh dei messaggi
      fetchMessages();
    } catch (error) {
      console.error('Error sending location request:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la richiesta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendBirthdateChangeRequest = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !newBirthdateData) return;

      const formattedDate = new Date(newBirthdateData.birthdate).toLocaleDateString('it-IT');
      const messageText = `🎂 Richiesta cambio data di nascita\n\nVorrei cambiare la mia data di nascita in: ${formattedDate}`;

      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          user_email: userEmail || user.email,
          message: messageText,
          is_admin_response: false,
          request_type: 'birthdate_change',
          request_status: 'pending',
          request_data: newBirthdateData,
        });

      if (error) throw error;
      setRequestSent(true);

      // Messaggio automatico di conferma
      setTimeout(async () => {
        await supabase
          .from('support_messages')
            .insert({
              user_id: user.id,
              user_email: userEmail || user.email,
              message: "🎂 Grazie per la tua richiesta di cambio data di nascita. Il nostro team la esaminerà al più presto e ti farà sapere se potrà essere approvata.",
              is_admin_response: true,
            });
      }, 500);

      toast({
        title: "✅ Richiesta inviata",
        description: `Richiesta di cambio data di nascita a "${formattedDate}" inviata con successo`,
      });

      // Refresh dei messaggi
      fetchMessages();
    } catch (error) {
      console.error('Error sending birthdate request:', error);
      toast({
        title: "Errore",
        description: "Impossibile inviare la richiesta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedImage && !selectedFile) return;

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
      let fileUrl: string | null = null;
      let fileName: string | null = null;

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

      // 📎 Upload file generico (PDF, ZIP, DOC, ...)
      if (selectedFile) {
        const fileData = await uploadFile(selectedFile, user.id);
        if (!fileData || fileData.error || !fileData.url) {
          toast({
            title: t("support.error"),
            description:
              fileData?.error
                ? `Upload fallito: ${fileData.error}. Esegui la migration SQL.`
                : "Impossibile caricare il file. Esegui la migration SQL.",
            variant: "destructive",
          });
          return;
        }
        fileUrl = fileData.url;
        fileName = fileData.name;
      }

      // Etichetta automatica se il messaggio è vuoto ma c'è un allegato
      let messageText = newMessage.trim();
      if (!messageText) {
        if (selectedImage) messageText = t("support.imageLabel");
        else if (selectedFile) messageText = `📎 ${fileName}`;
      }

      // 🔁 INSERT con fallback: se le colonne file_url/file_name non esistono
      //    ancora nel DB (migration non applicata), retry senza quei campi e
      //    aggiungi il link nel testo del messaggio così l'utente lo vede.
      const insertBase: any = {
        user_id: user.id,
        user_email: userEmail,
        message: messageText,
        is_admin_response: false,
        image_url: imageUrl,
      };
      const insertWithFile: any = {
        ...insertBase,
        file_url: fileUrl,
        file_name: fileName,
      };
      let { error } = await supabase
        .from('support_messages')
        .insert(insertWithFile);
      if (error) {
        const eMsg = String((error as any)?.message || '').toLowerCase();
        const isMissingCol = eMsg.includes('file_url') || eMsg.includes('file_name') || eMsg.includes('column');
        if (isMissingCol && fileUrl) {
          console.warn('[supportChat] colonne file_* mancanti, fallback inline link');
          insertBase.message = `${messageText}\n\n📎 ${fileName}: ${fileUrl}`;
          const retry = await supabase
            .from('support_messages')
            .insert(insertBase);
          error = retry.error as any;
        }
      }

      if (error) throw error;

      // 🔄 Fix realtime: forza il refresh subito dopo l'INSERT invece
      // di affidarci solo al channel postgres_changes (che a volte non
      // ribadisce l'evento al client che lo ha originato).
      await fetchMessages();

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
          // Refresh anche dopo il messaggio bot così l'utente lo vede subito
          await fetchMessages();
        }, 1000);
      }

      setNewMessage("");
      removeImage();
      removeFile();
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

  // 📛 Trova l'admin più recente che ha risposto in questa chat (per header).
  // Se ci sono più admin diversi che hanno risposto, mostra quello dell'ULTIMO
  // messaggio admin (quello che sta gestendo la conversazione ora).
  const lastAdminMessage = [...messages]
    .reverse()
    .find((m) => m.is_admin_response && m.admin_id);
  const currentAdminName =
    lastAdminMessage?.admin_id && adminNames[lastAdminMessage.admin_id]
      ? adminNames[lastAdminMessage.admin_id]
      : null;

  return (
    <Card className="border-0 shadow-2xl bg-background/95 backdrop-blur-md h-[600px] flex flex-col max-w-2xl mx-auto">
      <CardHeader className="border-b bg-primary/5 pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold">{t("support.chatTitle")}</h3>
            {currentAdminName ? (
              <p className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ti sta assistendo <span className="font-medium text-foreground">{currentAdminName}</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground font-normal">{t("support.chatSubtitle")}</p>
            )}
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
                  <div key={msg.id}>
                    <div
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
                        {msg.file_url && (
                          <button
                            type="button"
                            onClick={() =>
                              downloadRemoteFile(
                                msg.file_url!,
                                msg.file_name || 'file'
                              )
                            }
                            className={`flex items-center gap-2 p-2 rounded-lg mb-2 transition-colors w-full text-left ${
                              msg.is_admin_response
                                ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                                : 'bg-background/60 hover:bg-background/80 border'
                            }`}
                            title="Clicca per scaricare"
                          >
                            <FileText className="h-5 w-5 flex-shrink-0" />
                            <span className="text-sm font-medium truncate max-w-[200px]">
                              {msg.file_name || 'File allegato'}
                            </span>
                          </button>
                        )}
                        <p className="text-sm leading-relaxed whitespace-pre-line break-words">
                          <LinkifiedText text={msg.message} />
                        </p>
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
                            <AvatarFallback className="bg-gradient-to-br from-green-500 to-teal-600 text-white font-semibold">
                              <Headphones className="h-5 w-5" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                    </div>

                    {/* Banner per richiesta cambio location dell'utente */}
                    {msg.request_type === 'location_change' && !msg.is_admin_response && (
                      <div className="ml-12 mt-2 mb-4">
                        <div className={`p-4 rounded-lg border-2 ${
                          msg.request_status === 'pending' 
                            ? 'bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700' 
                            : msg.request_status === 'approved'
                            ? 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700'
                            : 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700'
                        }`}>
                          <div className="flex items-start gap-3">
                            <MapPin className={`h-5 w-5 mt-0.5 ${
                              msg.request_status === 'pending'
                                ? 'text-blue-600 dark:text-blue-400'
                                : msg.request_status === 'approved'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`} />
                            <div className="flex-1">
                              <p className={`font-semibold text-sm mb-1 ${
                                msg.request_status === 'pending'
                                  ? 'text-blue-900 dark:text-blue-100'
                                  : msg.request_status === 'approved'
                                  ? 'text-green-900 dark:text-green-100'
                                  : 'text-red-900 dark:text-red-100'
                              }`}>
                                {msg.request_status === 'pending' && '⏳ Richiesta in attesa'}
                                {msg.request_status === 'approved' && '✅ Richiesta approvata!'}
                                {msg.request_status === 'rejected' && '❌ Richiesta rifiutata'}
                              </p>
                              <p className={`text-sm ${
                                msg.request_status === 'pending'
                                  ? 'text-blue-800 dark:text-blue-200'
                                  : msg.request_status === 'approved'
                                  ? 'text-green-800 dark:text-green-200'
                                  : 'text-red-800 dark:text-red-200'
                              }`}>
                                Nuova location: <strong>{msg.request_data?.city}</strong>
                              </p>
                              {msg.request_status === 'pending' && (
                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                                  Il supporto clienti esaminerà la tua richiesta al più presto.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Banner per richiesta cambio data di nascita dell'utente */}
                    {msg.request_type === 'birthdate_change' && !msg.is_admin_response && (
                      <div className="ml-12 mt-2 mb-4">
                        <div className={`p-4 rounded-lg border-2 ${
                          msg.request_status === 'pending' 
                            ? 'bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-700' 
                            : msg.request_status === 'approved'
                            ? 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700'
                            : 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700'
                        }`}>
                          <div className="flex items-start gap-3">
                            <Calendar className={`h-5 w-5 mt-0.5 ${
                              msg.request_status === 'pending'
                                ? 'text-purple-600 dark:text-purple-400'
                                : msg.request_status === 'approved'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`} />
                            <div className="flex-1">
                              <p className={`font-semibold text-sm mb-1 ${
                                msg.request_status === 'pending'
                                  ? 'text-purple-900 dark:text-purple-100'
                                  : msg.request_status === 'approved'
                                  ? 'text-green-900 dark:text-green-100'
                                  : 'text-red-900 dark:text-red-100'
                              }`}>
                                {msg.request_status === 'pending' && '⏳ Richiesta in attesa'}
                                {msg.request_status === 'approved' && '✅ Richiesta approvata!'}
                                {msg.request_status === 'rejected' && '❌ Richiesta rifiutata'}
                              </p>
                              <p className={`text-sm ${
                                msg.request_status === 'pending'
                                  ? 'text-purple-800 dark:text-purple-200'
                                  : msg.request_status === 'approved'
                                  ? 'text-green-800 dark:text-green-200'
                                  : 'text-red-800 dark:text-red-200'
                              }`}>
                                Nuova data di nascita: <strong>{msg.request_data?.birthdate && new Date(msg.request_data.birthdate).toLocaleDateString('it-IT')}</strong>
                              </p>
                              {msg.request_status === 'pending' && (
                                <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
                                  Il supporto clienti esaminerà la tua richiesta al più presto.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
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
          {/* 📎 Preview file generico (PDF/ZIP/DOC/...) selezionato ma non ancora inviato */}
          {selectedFile && (
            <div className="mb-3 inline-flex items-center gap-2 p-2 pr-3 rounded-lg border-2 border-primary/20 bg-background/80">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium truncate max-w-[200px]">
                {selectedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 rounded-full"
                onClick={removeFile}
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
            {/* 📎 Input file generico (qualsiasi tipo) */}
            <input
              ref={fileGenericInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="rounded-full h-10 w-10 shrink-0"
              title="Allega immagine"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileGenericInputRef.current?.click()}
              disabled={loading}
              className="rounded-full h-10 w-10 shrink-0"
              title="Allega file"
            >
              <Paperclip className="h-4 w-4" />
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
              disabled={loading || (!newMessage.trim() && !selectedImage && !selectedFile)}
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