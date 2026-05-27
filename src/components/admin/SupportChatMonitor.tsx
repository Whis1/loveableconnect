import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, User, Trash2, MapPin, Check, X, Calendar, UserX, Copy, Image as ImageIcon, Paperclip, FileText, Shield, Mail, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  profiles?: { nickname: string };
  request_type?: string;
  request_status?: string;
  request_data?: any;
}

interface UserConversation {
  user_id: string;
  user_email: string;
  nickname: string;
  avatar_url: string | null;
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
  // 📛 Mappa admin_id → display_name per mostrare il nome di chi ha risposto
  const [adminNames, setAdminNames] = useState<Record<string, string>>({});
  // 🔍 Filtro ricerca conversazioni
  const [searchQuery, setSearchQuery] = useState("");
  // 📎 Allegati admin: immagine + file generico
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileGenericInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 📜 Ref sul div sentinella alla fine dei messaggi: usato per scrollIntoView.
  // ScrollArea di shadcn/Radix wrappa un viewport interno, quindi scrollare
  // direttamente scrollRef NON funziona. Usiamo scrollIntoView sul sentinella.
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages
    const channel = supabase
      .channel('admin-support-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
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

  // 📜 Autoscroll all'ultimo messaggio:
  // - quando arrivano nuovi messaggi
  // - quando viene selezionato un utente (apertura conversazione)
  // Usiamo setTimeout per attendere che il DOM renderizzi tutti i messaggi
  // prima di scrollare (ScrollArea di Radix renderizza il viewport in modo async).
  useEffect(() => {
    if (!selectedUserId || messages.length === 0) return;
    const t = setTimeout(() => {
      // Prima tentativa: scrollIntoView sul sentinella (più affidabile con Radix)
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
      }
      // Fallback: trova il viewport interno di Radix e forzane lo scroll
      const viewport = scrollRef.current?.querySelector<HTMLElement>(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }, 100);
    return () => clearTimeout(t);
  }, [messages, selectedUserId]);

  // 🖼️ Helper: trasforma path Storage in URL pubblica per gli avatar.
  const getAvatarUrl = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const fetchConversations = async () => {
    try {
      // Query diretta su support_messages includendo 'read'.
      const { data: allMessages, error } = await supabase
        .from('support_messages')
        .select('id, user_id, user_email, message, is_admin_response, read, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const userIds = Array.from(
        new Set((allMessages ?? []).map((m: any) => m.user_id).filter(Boolean))
      );

      // Fetch nickname + avatar dei profili
      let profMap: Record<string, { nickname: string; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, nickname, avatar_url')
          .in('id', userIds);
        profMap = (profs ?? []).reduce((acc: any, p: any) => {
          acc[p.id] = { nickname: p.nickname, avatar_url: p.avatar_url };
          return acc;
        }, {});
      }

      const grouped = (allMessages ?? []).reduce(
        (acc: Record<string, UserConversation>, msg: any) => {
          if (!msg.user_id) return acc;
          if (!acc[msg.user_id]) {
            const prof = profMap[msg.user_id];
            acc[msg.user_id] = {
              user_id: msg.user_id,
              user_email: msg.user_email || '',
              nickname: prof?.nickname || 'N/A',
              avatar_url: prof?.avatar_url || null,
              unread_count: 0,
              last_message: msg.message,
              last_message_time: msg.created_at,
            };
          }
          if (msg.is_admin_response === false && msg.read === false) {
            acc[msg.user_id].unread_count++;
          }
          return acc;
        },
        {}
      );

      // Ordina per: non-lette in cima → poi per timestamp ultimo messaggio
      const sorted = Object.values(grouped).sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (a.unread_count === 0 && b.unread_count > 0) return 1;
        return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
      });

      setConversations(sorted);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      // 📎 Query diretta (al posto dell'edge function admin-list-support) per
      // garantire che i nuovi campi siano sempre inclusi senza dipendere
      // dall'aggiornamento dell'edge function remota.
      const { data, error } = await supabase
        .from('support_messages')
        .select(
          'id, user_id, user_email, message, is_admin_response, read, created_at, image_url, file_url, file_name, admin_id, request_type, request_status, request_data'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const msgs = (data || []) as SupportMessage[];
      setMessages(msgs);

      // 📛 Carica i display_name degli admin che hanno risposto in questa
      // conversazione (così possiamo mostrare il nome sotto i bubble).
      const adminIds = Array.from(
        new Set(msgs.map((m) => m.admin_id).filter(Boolean) as string[])
      );
      const missing = adminIds.filter((id) => !adminNames[id]);
      if (missing.length > 0) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, display_name')
          .in('user_id', missing);
        if (roles && roles.length > 0) {
          setAdminNames((prev) => {
            const next = { ...prev };
            (roles as any[]).forEach((r) => {
              next[r.user_id] = r.display_name || 'Admin';
            });
            return next;
          });
        }
      }

      // 🔔 Marca come letti via RPC SECURITY DEFINER → bypassa RLS che
      // bloccava silenziosamente l'UPDATE diretto. La RPC ritorna
      // updated_count con il numero di righe toccate (utile per debug).
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'mark_support_messages_read' as any,
          { p_user_id: userId }
        );
        if (rpcErr) {
          console.warn('⚠️ Mark-as-read RPC failed:', rpcErr);
        } else {
          const updatedCount = Array.isArray(rpcData)
            ? (rpcData[0] as any)?.updated_count
            : (rpcData as any)?.updated_count;
          console.log(`✓ ${updatedCount ?? 0} messaggi marcati come letti`);
        }
      } catch (e) {
        console.warn('mark_support_messages_read exception:', e);
      }

      // Aggiorna lo stato locale: badge sparisce subito.
      setConversations((prev) =>
        prev.map((c) =>
          c.user_id === userId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    fetchMessages(userId);
  };

  // 🖼️ Upload immagine — gli admin usano lo stesso bucket `support-images`
  const uploadImage = async (file: File, adminId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${adminId}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('support-images')
      .upload(fileName, file);
    if (uploadError) {
      console.error('Error uploading image (admin):', uploadError);
      return null;
    }
    const { data } = supabase.storage.from('support-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  // 📎 Upload file generico — bucket dedicato `support-files` con fallback
  //    su `support-images` se il bucket dedicato non esiste ancora.
  const uploadFile = async (
    file: File,
    adminId: string
  ): Promise<{ url: string; name: string; error?: string } | null> => {
    const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const baseName = `${adminId}/${Date.now()}-${sanitized}`;
    let bucket = 'support-files';
    let path = baseName;
    let { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file);
    if (uploadError) {
      console.warn('[admin uploadFile] support-files failed:', uploadError);
      const msg = String((uploadError as any)?.message || '').toLowerCase();
      if (msg.includes('not found') || msg.includes('does not exist') || msg.includes('bucket')) {
        bucket = 'support-images';
        path = `files/${baseName}`;
        const fb = await supabase.storage.from(bucket).upload(path, file);
        uploadError = fb.error;
        if (!uploadError) console.warn('[admin uploadFile] fallback su support-images ok');
      }
    }
    if (uploadError) {
      console.error('Upload file error (admin final):', uploadError);
      return { url: '', name: file.name, error: (uploadError as any).message };
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, name: file.name };
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Errore",
        description: "Immagine troppo grande (max 5MB)",
        variant: "destructive",
      });
      return;
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Errore",
        description: "File troppo grande (max 10MB)",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
  };

  // 📋 Paste handler: se l'admin incolla un'immagine dagli appunti la cattura
  // come allegato. Se incolla testo/link, viene gestito normalmente dall'Input.
  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        event.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            toast({
              title: "Errore",
              description: "Immagine troppo grande (max 5MB)",
              variant: "destructive",
            });
            return;
          }
          setSelectedImage(file);
          const reader = new FileReader();
          reader.onloadend = () => setImagePreview(reader.result as string);
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileGenericInputRef.current) fileGenericInputRef.current.value = '';
  };

  const handleDeleteConversation = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Sei sicuro di voler eliminare questa conversazione? Tutti i messaggi verranno eliminati.')) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-support-conversation', {
        body: { userId }
      });

      if (error || !data?.success) throw new Error(error?.message || data?.error || 'Delete failed');

      toast({
        title: "Conversazione eliminata",
        description: "La conversazione è stata eliminata con successo",
      });

      // Aggiorna stato locale immediatamente
      setConversations((prev) => prev.filter((c) => c.user_id !== userId));

      if (selectedUserId === userId) {
        setSelectedUserId(null);
        setMessages([]);
      }

      // Refresh di sicurezza
      fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare la conversazione",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLocationChange = async (msg: SupportMessage) => {
    if (!msg.request_data) return;

    setLoading(true);
    try {
      // Aggiorna il profilo con la nuova location
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          city: msg.request_data.city,
          latitude: msg.request_data.latitude,
          longitude: msg.request_data.longitude,
          location_locked: true,
        })
        .eq('id', msg.user_id);

      if (updateError) throw updateError;

      // Aggiorna lo stato della richiesta
      const { error: msgError } = await supabase
        .from('support_messages')
        .update({ request_status: 'approved' })
        .eq('id', msg.id);

      if (msgError) throw msgError;

      // Invia messaggio di conferma
      await supabase
        .from('support_messages')
        .insert({
          user_id: msg.user_id,
          user_email: msg.user_email || '',
          message: `✅ La tua richiesta di cambio location a "${msg.request_data.city}" è stata approvata!`,
          is_admin_response: true,
        });

      toast({
        title: "Richiesta approvata",
        description: "La location è stata aggiornata con successo",
      });

      fetchMessages(msg.user_id);
    } catch (error) {
      console.error('Error approving location change:', error);
      toast({
        title: "Errore",
        description: "Impossibile approvare la richiesta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectLocationChange = async (msg: SupportMessage) => {
    setLoading(true);
    try {
      // Aggiorna lo stato della richiesta
      const { error: msgError } = await supabase
        .from('support_messages')
        .update({ request_status: 'rejected' })
        .eq('id', msg.id);

      if (msgError) throw msgError;

      // Invia messaggio di rifiuto
      await supabase
        .from('support_messages')
        .insert({
          user_id: msg.user_id,
          user_email: msg.user_email || '',
          message: `❌ La tua richiesta di cambio location è stata rifiutata. Per maggiori informazioni contatta il supporto.`,
          is_admin_response: true,
        });

      toast({
        title: "Richiesta rifiutata",
        description: "L'utente è stato informato",
      });

      fetchMessages(msg.user_id);
    } catch (error) {
      console.error('Error rejecting location change:', error);
      toast({
        title: "Errore",
        description: "Impossibile rifiutare la richiesta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBirthdateChange = async (msg: SupportMessage) => {
    if (!msg.request_data) return;

    setLoading(true);
    try {
      const birthdate = msg.request_data.birthdate;
      const age = Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

      // Aggiorna il profilo con la nuova data di nascita
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          birthdate: birthdate,
          age: age,
          birthdate_locked: true,
        })
        .eq('id', msg.user_id);

      if (updateError) throw updateError;

      // Aggiorna lo stato della richiesta
      const { error: msgError } = await supabase
        .from('support_messages')
        .update({ request_status: 'approved' })
        .eq('id', msg.id);

      if (msgError) throw msgError;

      const formattedDate = new Date(birthdate).toLocaleDateString('it-IT');
      // Invia messaggio di conferma
      await supabase
        .from('support_messages')
        .insert({
          user_id: msg.user_id,
          user_email: msg.user_email || '',
          message: `✅ La tua richiesta di cambio data di nascita a "${formattedDate}" è stata approvata!`,
          is_admin_response: true,
        });

      toast({
        title: "Richiesta approvata",
        description: "La data di nascita è stata aggiornata con successo",
      });

      fetchMessages(msg.user_id);
    } catch (error) {
      console.error('Error approving birthdate change:', error);
      toast({
        title: "Errore",
        description: "Impossibile approvare la richiesta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectBirthdateChange = async (msg: SupportMessage) => {
    setLoading(true);
    try {
      // Aggiorna lo stato della richiesta
      const { error: msgError } = await supabase
        .from('support_messages')
        .update({ request_status: 'rejected' })
        .eq('id', msg.id);

      if (msgError) throw msgError;

      // Invia messaggio di rifiuto
      await supabase
        .from('support_messages')
        .insert({
          user_id: msg.user_id,
          user_email: msg.user_email || '',
          message: `❌ La tua richiesta di cambio data di nascita è stata rifiutata. Per maggiori informazioni contatta il supporto.`,
          is_admin_response: true,
        });

      toast({
        title: "Richiesta rifiutata",
        description: "L'utente è stato informato",
      });

      fetchMessages(msg.user_id);
    } catch (error) {
      console.error('Error rejecting birthdate change:', error);
      toast({
        title: "Errore",
        description: "Impossibile rifiutare la richiesta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAccountDeletion = async (msg: SupportMessage) => {
    setLoading(true);
    try {
      // Call edge function to delete account
      const { data, error } = await supabase.functions.invoke('admin-delete-account', {
        body: { userId: msg.user_id, requestId: msg.id },
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to delete account');
      }

      toast({
        title: "Account eliminato",
        description: "L'account utente è stato eliminato con successo",
      });

      // Ricarica le conversazioni (quella eliminata non sarà più presente)
      fetchConversations();
      setSelectedUserId(null);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare l'account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAccountDeletion = async (msg: SupportMessage) => {
    setLoading(true);
    try {
      // Aggiorna lo stato della richiesta
      const { error: msgError } = await supabase
        .from('support_messages')
        .update({ request_status: 'rejected' })
        .eq('id', msg.id);

      if (msgError) throw msgError;

      // Invia messaggio di rifiuto
      await supabase
        .from('support_messages')
        .insert({
          user_id: msg.user_id,
          user_email: msg.user_email || '',
          message: `❌ La tua richiesta di eliminazione account è stata rifiutata. Per maggiori informazioni contatta il supporto.`,
          is_admin_response: true,
        });

      toast({
        title: "Richiesta rifiutata",
        description: "L'utente è stato informato",
      });

      fetchMessages(msg.user_id);
    } catch (error) {
      console.error('Error rejecting account deletion:', error);
      toast({
        title: "Errore",
        description: "Impossibile rifiutare la richiesta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage && !selectedFile) || !selectedUserId) return;

    const selectedConv = conversations.find(c => c.user_id === selectedUserId);
    if (!selectedConv) return;

    setLoading(true);
    const tempId = `temp-${Date.now()}`;
    const messageToSend = newMessage;

    try {
      // Recupera l'ID admin per i path di upload
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Admin non autenticato");

      // 🖼️ Upload immagine (se selezionata)
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage, adminUser.id);
        if (!imageUrl) {
          toast({
            title: "Errore",
            description: "Impossibile caricare l'immagine",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }

      // 📎 Upload file generico (se selezionato)
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      if (selectedFile) {
        const fileData = await uploadFile(selectedFile, adminUser.id);
        if (!fileData || fileData.error || !fileData.url) {
          toast({
            title: "Errore",
            description:
              fileData?.error
                ? `Upload fallito: ${fileData.error}. Esegui la migration SQL.`
                : "Impossibile caricare il file. Esegui la migration SQL.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        fileUrl = fileData.url;
        fileName = fileData.name;
      }

      // Etichetta automatica se nessun testo ma c'è allegato
      let finalMessage = messageToSend.trim();
      if (!finalMessage) {
        if (selectedImage) finalMessage = "🖼️ Immagine";
        else if (selectedFile) finalMessage = `📎 ${fileName}`;
      }

      // Messaggio ottimistico
      const tempMsg: SupportMessage = {
        id: tempId,
        user_id: selectedUserId,
        user_email: selectedConv.user_email || '',
        message: finalMessage,
        is_admin_response: true,
        created_at: new Date().toISOString(),
        read: true,
        image_url: imageUrl ?? undefined,
        file_url: fileUrl ?? undefined,
        file_name: fileName ?? undefined,
        admin_id: adminUser.id,
      };
      setMessages((prev) => [...prev, tempMsg]);
      setNewMessage("");
      removeImage();
      removeFile();

      // 🔁 Insert con fallback: se le colonne file_url/file_name/admin_id non
      //    esistono ancora (migration non applicata), retry senza quei campi
      //    e metti il link nel testo del messaggio.
      const baseInsert: any = {
        user_id: selectedUserId,
        user_email: selectedConv.user_email || '',
        message: finalMessage,
        is_admin_response: true,
        image_url: imageUrl,
      };
      const withExtras: any = {
        ...baseInsert,
        file_url: fileUrl,
        file_name: fileName,
        admin_id: adminUser.id,
      };
      let { error } = await supabase
        .from('support_messages')
        .insert(withExtras);
      if (error) {
        const eMsg = String((error as any)?.message || '').toLowerCase();
        const isMissingCol =
          eMsg.includes('file_url') ||
          eMsg.includes('file_name') ||
          eMsg.includes('admin_id') ||
          eMsg.includes('column');
        if (isMissingCol) {
          console.warn('[admin] colonne extra mancanti, fallback senza quei campi');
          if (fileUrl) {
            baseInsert.message = `${finalMessage}\n\n📎 ${fileName}: ${fileUrl}`;
          }
          const retry = await supabase
            .from('support_messages')
            .insert(baseInsert);
          error = retry.error as any;
        }
      }
      if (error) throw error;

      await fetchMessages(selectedUserId);
      fetchConversations();
      // Toast "Risposta inviata" rimosso su richiesta utente: era invasivo
      // ad ogni messaggio.
    } catch (error: any) {
      console.error('Error sending support message:', error);
      // Rimuovi il messaggio temporaneo e ripristina il testo.
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(messageToSend);
      toast({
        title: "Errore",
        description: error?.message || error?.error_description || "Impossibile inviare la risposta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Filtra conversazioni in base alla ricerca
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.nickname.toLowerCase().includes(q) ||
      c.user_email.toLowerCase().includes(q) ||
      c.user_id.toLowerCase().includes(q)
    );
  });

  // Conversazione attualmente selezionata (per l'header)
  const selectedConv = conversations.find((c) => c.user_id === selectedUserId);
  const totalUnread = conversations.reduce((a, c) => a + c.unread_count, 0);

  // Helper: timestamp relativo per la lista (es. "ora", "5m", "ieri", "lun")
  const formatRelativeTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000; // secondi
    if (diff < 60) return "ora";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 86400 * 7) return d.toLocaleDateString("it-IT", { weekday: "short" });
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
  };

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Chat di Supporto</h2>
              <p className="text-xs text-muted-foreground font-normal">
                {conversations.length} conversazion{conversations.length === 1 ? 'e' : 'i'} totali
              </p>
            </div>
          </div>
          {totalUnread > 0 && (
            <Badge className="bg-red-500 hover:bg-red-500 text-white shadow-md animate-pulse">
              {totalUnread} non lett{totalUnread === 1 ? 'o' : 'i'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] h-[640px] overflow-hidden">
          {/* 📋 Lista conversazioni */}
          <div className="border-r flex flex-col min-h-0 overflow-hidden">
            {/* Search bar */}
            <div className="p-3 border-b bg-muted/30 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca utente, email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 bg-background"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-2 space-y-1">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                      <MessageCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'Nessun risultato' : 'Nessuna conversazione'}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const avatarUrl = getAvatarUrl(conv.avatar_url);
                    const isActive = selectedUserId === conv.user_id;
                    return (
                      <div
                        key={conv.user_id}
                        onClick={() => handleSelectUser(conv.user_id)}
                        className={`group relative p-2.5 rounded-xl cursor-pointer transition-all ${
                          isActive
                            ? 'bg-primary/10 ring-1 ring-primary shadow-sm'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar className="h-11 w-11 ring-2 ring-background">
                              {avatarUrl && <AvatarImage src={avatarUrl} alt={conv.nickname} />}
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                                {conv.nickname.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {conv.unread_count > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`font-semibold text-sm truncate ${
                                  conv.unread_count > 0 ? 'text-foreground' : 'text-foreground/80'
                                }`}
                              >
                                {conv.nickname}
                              </p>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {formatRelativeTime(conv.last_message_time)}
                              </span>
                            </div>
                            {/* 🔒 Rimosso ultimo messaggio per privacy: l'admin
                                lo legge solo aprendo la chat. */}
                            <div className="flex items-center gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <span className="text-[9px] text-muted-foreground font-mono truncate">
                                {conv.user_id.slice(0, 8)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(conv.user_id);
                                  toast({ title: "ID copiato", description: conv.user_id });
                                }}
                                className="h-4 w-4 flex items-center justify-center hover:text-primary"
                                title="Copia ID completo"
                              >
                                <Copy className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteConversation(conv.user_id, e)}
                                className="h-4 w-4 flex items-center justify-center text-destructive hover:opacity-100 opacity-50 ml-auto"
                                title="Elimina conversazione"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* 💬 Area messaggi */}
          <div className="flex flex-col min-h-0 overflow-hidden">
            {selectedUserId && selectedConv ? (
              <>
                {/* 👤 Header conversazione */}
                <div className="border-b p-3 bg-gradient-to-r from-muted/50 to-muted/20 flex items-center gap-3 flex-shrink-0">
                  <Avatar className="h-11 w-11 ring-2 ring-primary/20">
                    {getAvatarUrl(selectedConv.avatar_url) && (
                      <AvatarImage src={getAvatarUrl(selectedConv.avatar_url)!} />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                      {selectedConv.nickname.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base truncate">{selectedConv.nickname}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {selectedConv.user_email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{selectedConv.user_email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteConversation(selectedConv.user_id, e)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Elimina conversazione"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* 💬 Messaggi */}
                <ScrollArea className="flex-1 min-h-0 px-4 py-4" ref={scrollRef}>
                  <div className="space-y-3">
                    {messages.map((msg, idx) => {
                      // Mostra il nome admin solo se è il primo messaggio admin
                      // di una "sequenza" (cambio rispetto al precedente) per ridurre rumore
                      const prev = idx > 0 ? messages[idx - 1] : null;
                      const sameAuthorAsPrev =
                        prev &&
                        prev.is_admin_response === msg.is_admin_response &&
                        prev.admin_id === msg.admin_id;
                      const showAdminName =
                        msg.is_admin_response &&
                        msg.admin_id &&
                        !sameAuthorAsPrev;
                      const adminName =
                        (msg.admin_id && adminNames[msg.admin_id]) || 'Supporto';

                      return (
                        <div key={msg.id}>
                          {/* 📛 Etichetta admin che risponde (solo per primo della sequenza) */}
                          {showAdminName && (
                            <div className="flex justify-end mb-1 pr-12">
                              <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                <Shield className="h-2.5 w-2.5 text-primary" />
                                {adminName}
                              </span>
                            </div>
                          )}
                          <div
                            className={`flex gap-2 ${
                              msg.is_admin_response ? 'justify-end' : 'justify-start'
                            } animate-in fade-in slide-in-from-bottom-1`}
                          >
                            {!msg.is_admin_response && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                {getAvatarUrl(selectedConv.avatar_url) && (
                                  <AvatarImage
                                    src={getAvatarUrl(selectedConv.avatar_url)!}
                                  />
                                )}
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold">
                                  {selectedConv.nickname.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2.5 break-words shadow-sm ${
                                msg.is_admin_response
                                  ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm'
                                  : 'bg-muted rounded-tl-sm'
                              }`}
                            >
                              {/* 🖼️ Immagine allegata */}
                              {msg.image_url && (
                                <img
                                  src={msg.image_url}
                                  alt="Immagine"
                                  className="rounded-lg max-w-[260px] max-h-56 object-cover mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(msg.image_url, '_blank')}
                                />
                              )}
                              {/* 📎 File generico allegato (scaricabile) */}
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
                                  <span className="text-sm font-medium truncate max-w-[180px]">
                                    {msg.file_name || 'File allegato'}
                                  </span>
                                </button>
                              )}
                              <p className="text-sm whitespace-pre-line leading-relaxed">
                                <LinkifiedText text={msg.message} />
                              </p>
                              <p className="text-[10px] opacity-60 mt-1 text-right">
                                {new Date(msg.created_at).toLocaleTimeString('it-IT', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            {msg.is_admin_response && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
                                  {adminName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        
                        {/* Banner per richiesta cambio location - solo per messaggi non admin */}
                        {msg.request_type === 'location_change' && !msg.is_admin_response && msg.request_status === 'pending' && (
                          <div className="mt-3 mb-4 ml-11">
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl border-2 border-blue-300 dark:border-blue-700 shadow-md">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                  <MapPin className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-blue-900 dark:text-blue-100 text-base">
                                    🗺️ Richiesta Cambio Location
                                  </p>
                                  <p className="text-sm text-blue-700 dark:text-blue-300">
                                    L'utente desidera cambiare location
                                  </p>
                                </div>
                              </div>
                              
                              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 mb-3">
                                <p className="text-sm text-blue-800 dark:text-blue-200 mb-1">
                                  <span className="font-semibold">Nuova location richiesta:</span>
                                </p>
                                <p className="text-lg font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                  <MapPin className="h-5 w-5" />
                                  {msg.request_data?.city}
                                </p>
                              </div>
                              
                              <div className="flex gap-3">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveLocationChange(msg)}
                                  disabled={loading}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  ✅ Approva
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRejectLocationChange(msg)}
                                  disabled={loading}
                                  className="flex-1 font-semibold shadow-md"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  ❌ Rifiuta
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Banner per richiesta cambio data di nascita - solo per messaggi non admin */}
                        {msg.request_type === 'birthdate_change' && !msg.is_admin_response && msg.request_status === 'pending' && (
                          <div className="mt-3 mb-4 ml-11">
                            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl border-2 border-purple-300 dark:border-purple-700 shadow-md">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center">
                                  <Calendar className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-purple-900 dark:text-purple-100 text-base">
                                    🎂 Richiesta Cambio Data di Nascita
                                  </p>
                                  <p className="text-sm text-purple-700 dark:text-purple-300">
                                    L'utente desidera cambiare data di nascita
                                  </p>
                                </div>
                              </div>
                              
                              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 mb-3">
                                <p className="text-sm text-purple-800 dark:text-purple-200 mb-1">
                                  <span className="font-semibold">Nuova data di nascita richiesta:</span>
                                </p>
                                <p className="text-lg font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                                  <Calendar className="h-5 w-5" />
                                  {msg.request_data?.birthdate && new Date(msg.request_data.birthdate).toLocaleDateString('it-IT')}
                                </p>
                              </div>
                              
                              <div className="flex gap-3">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveBirthdateChange(msg)}
                                  disabled={loading}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  ✅ Approva
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRejectBirthdateChange(msg)}
                                  disabled={loading}
                                  className="flex-1 font-semibold shadow-md"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  ❌ Rifiuta
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Mostra stato per richieste approvate/rifiutate */}
                        {msg.request_type === 'location_change' && !msg.is_admin_response && msg.request_status !== 'pending' && (
                          <div className="mt-2 mb-3 ml-11">
                            <div className={`p-3 rounded-lg border ${
                              msg.request_status === 'approved'
                                ? 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700'
                                : 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700'
                            }`}>
                              <p className={`text-sm font-semibold ${
                                msg.request_status === 'approved'
                                  ? 'text-green-900 dark:text-green-100'
                                  : 'text-red-900 dark:text-red-100'
                              }`}>
                                {msg.request_status === 'approved' ? '✅ Richiesta approvata' : '❌ Richiesta rifiutata'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Mostra stato per richieste birthdate approvate/rifiutate */}
                        {msg.request_type === 'birthdate_change' && !msg.is_admin_response && msg.request_status !== 'pending' && (
                          <div className="mt-2 mb-3 ml-11">
                            <div className={`p-3 rounded-lg border ${
                              msg.request_status === 'approved'
                                ? 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700'
                                : 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700'
                            }`}>
                              <p className={`text-sm font-semibold ${
                                msg.request_status === 'approved'
                                  ? 'text-green-900 dark:text-green-100'
                                  : 'text-red-900 dark:text-red-100'
                              }`}>
                                {msg.request_status === 'approved' ? '✅ Richiesta approvata' : '❌ Richiesta rifiutata'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Banner per richiesta eliminazione account - solo per messaggi non admin */}
                        {msg.request_type === 'account_deletion' && !msg.is_admin_response && msg.request_status === 'pending' && (
                          <div className="mt-3 mb-4 ml-11">
                            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 rounded-xl border-2 border-red-400 dark:border-red-700 shadow-md">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center">
                                  <UserX className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-bold text-red-900 dark:text-red-100 text-base">
                                    ⚠️ Richiesta Eliminazione Account
                                  </p>
                                  <p className="text-sm text-red-700 dark:text-red-300">
                                    L'utente desidera eliminare definitivamente il proprio account
                                  </p>
                                </div>
                              </div>
                              
                              <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 mb-3">
                                <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                                  <span className="font-semibold">⚠️ ATTENZIONE:</span>
                                </p>
                                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 ml-4 list-disc">
                                  <li>Questa azione è irreversibile</li>
                                  <li>Tutti i dati dell'utente verranno eliminati</li>
                                  <li>Messaggi, match e profilo saranno rimossi</li>
                                </ul>
                              </div>
                              
                              <div className="flex gap-3">
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveAccountDeletion(msg)}
                                  disabled={loading}
                                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  ✅ Approva Eliminazione
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectAccountDeletion(msg)}
                                  disabled={loading}
                                  className="flex-1 font-semibold shadow-md"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  ❌ Rifiuta
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Mostra stato per richieste account deletion approvate/rifiutate */}
                        {msg.request_type === 'account_deletion' && !msg.is_admin_response && msg.request_status !== 'pending' && (
                          <div className="mt-2 mb-3 ml-11">
                            <div className={`p-3 rounded-lg border ${
                              msg.request_status === 'approved'
                                ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700'
                                : 'bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700'
                            }`}>
                              <p className={`text-sm font-semibold ${
                                msg.request_status === 'approved'
                                  ? 'text-red-900 dark:text-red-100'
                                  : 'text-green-900 dark:text-green-100'
                              }`}>
                                {msg.request_status === 'approved' ? '✅ Account eliminato' : '❌ Richiesta rifiutata'}
                              </p>
                            </div>
                          </div>
                        )}
                        </div>
                      );
                    })}
                    {/* 📜 Sentinella per autoscroll alla fine della chat */}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* ✍️ Input area */}
                <div className="border-t p-3 bg-muted/20 flex-shrink-0">
                  {/* 🖼️ Preview immagine allegata */}
                  {imagePreview && (
                    <div className="mb-2 relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Anteprima"
                        className="max-h-24 rounded-lg border-2 border-primary/20"
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
                  {/* 📎 Preview file generico allegato */}
                  {selectedFile && (
                    <div className="mb-2 inline-flex items-center gap-2 p-2 pr-3 rounded-lg border-2 border-primary/20 bg-background">
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
                  <div className="flex gap-2 items-center">
                    {/* 📎 Input file nascosti */}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <input
                      ref={fileGenericInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={loading}
                      title="Allega immagine"
                      className="rounded-full h-10 w-10 hover:bg-primary/10"
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fileGenericInputRef.current?.click()}
                      disabled={loading}
                      title="Allega file"
                      className="rounded-full h-10 w-10 hover:bg-primary/10"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Scrivi una risposta..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
                      onPaste={handlePaste}
                      disabled={loading}
                      className="flex-1 rounded-full border-2 focus-visible:ring-primary bg-background"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={loading || (!newMessage.trim() && !selectedImage && !selectedFile)}
                      size="icon"
                      className="rounded-full h-10 w-10 shadow-md"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full flex-col gap-3 text-muted-foreground p-12">
                <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center">
                  <MessageCircle className="h-10 w-10 text-primary/40" />
                </div>
                <p className="text-base font-medium">Seleziona una conversazione</p>
                <p className="text-xs text-center max-w-xs">
                  Scegli un utente dalla lista a sinistra per leggere e rispondere ai suoi messaggi
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};