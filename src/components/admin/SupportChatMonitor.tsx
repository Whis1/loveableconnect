import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, User, Trash2, MapPin, Check, X, Calendar, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SupportMessage {
  id: string;
  user_id: string;
  user_email: string;
  message: string;
  is_admin_response: boolean;
  created_at: string;
  read: boolean;
  profiles?: { nickname: string };
  request_type?: string;
  request_status?: string;
  request_data?: any;
}

interface UserConversation {
  user_id: string;
  user_email: string;
  nickname: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-support');
      if (error || !data?.success) throw new Error(error?.message || data?.error || 'Failed to load');
      const allMessages = (data.messages || []) as SupportMessage[];

      const grouped = allMessages.reduce((acc: Record<string, UserConversation>, msg) => {
        if (!acc[msg.user_id]) {
          acc[msg.user_id] = {
            user_id: msg.user_id,
            user_email: msg.user_email,
            nickname: msg.profiles?.nickname || 'N/A',
            unread_count: 0,
            last_message: msg.message,
            last_message_time: msg.created_at,
          };
        }
        if (!msg.is_admin_response && !msg.read) {
          acc[msg.user_id].unread_count++;
        }
        return acc;
      }, {});

      setConversations(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-support', {
        body: { userId }
      });
      if (error || !data?.success) throw new Error(error?.message || data?.error || 'Failed to load');
      setMessages((data.messages || []) as SupportMessage[]);

      // Best-effort mark as read (may fail without auth)
      try {
        await supabase
          .from('support_messages')
          .update({ read: true })
          .eq('user_id', userId)
          .eq('is_admin_response', false)
          .eq('read', false);
      } catch {}
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    fetchMessages(userId);
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
          user_email: msg.user_email,
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
          user_email: msg.user_email,
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
          user_email: msg.user_email,
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
          user_email: msg.user_email,
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
          user_email: msg.user_email,
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
    if (!newMessage.trim() || !selectedUserId) return;

    const selectedConv = conversations.find(c => c.user_id === selectedUserId);
    if (!selectedConv) return;

    setLoading(true);
    const tempId = `temp-${Date.now()}`;
    const messageToSend = newMessage;
    const tempMsg: SupportMessage = {
      id: tempId,
      user_id: selectedUserId,
      user_email: selectedConv.user_email,
      message: messageToSend,
      is_admin_response: true,
      created_at: new Date().toISOString(),
      read: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");

    try {
      // Inserimento diretto: il database ora consente le risposte di supporto.
      const { error } = await supabase
        .from('support_messages')
        .insert({
          user_id: selectedUserId,
          user_email: selectedConv.user_email,
          message: messageToSend,
          is_admin_response: true,
        });
      if (error) throw error;

      await fetchMessages(selectedUserId);
      fetchConversations();
      toast({
        title: "Risposta inviata",
        description: "La tua risposta è stata inviata all'utente",
      });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Chat di Supporto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
          {/* Lista conversazioni */}
          <div className="md:col-span-1 border-r pr-4">
            <h3 className="font-semibold mb-3">Conversazioni</h3>
            <ScrollArea className="h-[520px]">
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nessuna conversazione
                  </p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.user_id}
                      onClick={() => handleSelectUser(conv.user_id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedUserId === conv.user_id
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {conv.nickname}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.user_email}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {conv.unread_count > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs rounded-full px-2">
                              {conv.unread_count}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeleteConversation(conv.user_id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 break-words max-w-full">
                        {conv.last_message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Area messaggi */}
          <div className="md:col-span-2">
            {selectedUserId ? (
              <>
                <ScrollArea className="h-[480px] pr-4 mb-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id}>
                        <div
                          className={`flex gap-3 ${msg.is_admin_response ? 'justify-end' : 'justify-start'}`}
                        >
                          {!msg.is_admin_response && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-secondary">
                                U
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              msg.is_admin_response
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-line">{msg.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString('it-IT', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          {msg.is_admin_response && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                A
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
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Input
                    placeholder="Scrivi una risposta..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !loading && handleSendMessage()}
                    disabled={loading}
                  />
                  <Button onClick={handleSendMessage} disabled={loading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Seleziona una conversazione per iniziare
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};