import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, X, Heart, Gift, Coins, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import loveableConnectIcon from "@/assets/loveable-connect-icon.png";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface InboxMessage {
  id: string;
  message: string;
  created_at: string;
  read: boolean;
  reward_credits?: number | null;
  reward_likes?: number | null;
  reward_claimed?: boolean | null;
}

export const InboxDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // 🎁 Riscatta la ricompensa (crediti/like) allegata a un messaggio inbox.
  const handleClaim = async (message: InboxMessage) => {
    if (claimingId) return;
    setClaimingId(message.id);
    try {
      const { data, error } = await (supabase as any).rpc("claim_inbox_reward", { p_message_id: message.id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const credits = row?.credits ?? 0;
      const likes = row?.likes ?? 0;
      const already = row?.already ?? false;
      if (already) {
        toast({ title: "Già riscattato", description: "Questo regalo era già stato riscattato." });
      } else {
        const parts: string[] = [];
        if (credits > 0) parts.push(`${credits} crediti`);
        if (likes > 0) parts.push(`${likes} like`);
        toast({
          title: "Regalo riscattato! 🎁",
          description: parts.length ? `Hai ricevuto ${parts.join(" e ")}.` : "Regalo riscattato.",
        });
      }
      setSelectedMessage((cur) => (cur && cur.id === message.id ? { ...cur, reward_claimed: true } : cur));
      // Aggiorna subito i contatori in alto (crediti e like) senza aspettare il
      // polling: invalidiamo le query React Query usate da CreditsDisplay e
      // DailyLikesDisplay cosi' il saldo si aggiorna in tempo reale.
      queryClient.invalidateQueries({ queryKey: ["user-credits"] });
      queryClient.invalidateQueries({ queryKey: ["daily-likes"] });
      fetchMessages();
    } catch (e: any) {
      toast({ title: "Errore", description: e.message || "Impossibile riscattare il regalo", variant: "destructive" });
    } finally {
      setClaimingId(null);
    }
  };

  // Box "Riscatta" mostrato solo se il messaggio ha una ricompensa allegata.
  const renderReward = (message: InboxMessage) => {
    const credits = message.reward_credits ?? 0;
    const likes = message.reward_likes ?? 0;
    if (credits <= 0 && likes <= 0) return null;
    return (
      <div className="mt-3 rounded-lg border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-pink-500/10 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-300">
          <Gift className="h-4 w-4" /> Un regalo per te!
        </div>
        <div className="mb-2 flex items-center gap-4 text-sm">
          {credits > 0 && (
            <span className="inline-flex items-center gap-1 font-medium">
              <Coins className="h-4 w-4 text-yellow-500" /> {credits} crediti
            </span>
          )}
          {likes > 0 && (
            <span className="inline-flex items-center gap-1 font-medium">
              <Heart className="h-4 w-4 fill-current text-pink-500" /> {likes} like
            </span>
          )}
        </div>
        {message.reward_claimed ? (
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Riscattato
          </div>
        ) : (
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-amber-500 to-pink-500 text-white hover:from-amber-600 hover:to-pink-600"
            disabled={claimingId === message.id}
            onClick={(e) => {
              e.stopPropagation();
              handleClaim(message);
            }}
          >
            {claimingId === message.id ? "Riscatto..." : "Riscatta"}
          </Button>
        )}
      </div>
    );
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      fetchMessages();

      // Canale per-utente con filtro su user_id: e' lo stesso pattern che
      // funziona gia' per le notifiche dei messaggi (MatchNotificationContext).
      // Con la RLS attiva sulla tabella, il filtro e' necessario per ricevere
      // gli eventi in tempo reale.
      channel = supabase
        .channel(`inbox-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inbox_messages',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            fetchMessages();
          }
        )
        .subscribe();
    };

    setup();

    // Fallback: se il realtime non consegna (rete, sessione, ecc.) ricontrolliamo
    // periodicamente, cosi' il messaggio compare comunque entro pochi secondi
    // senza dover ricaricare la pagina.
    const pollId = window.setInterval(() => {
      fetchMessages();
    }, 20000);

    return () => {
      if (channel) supabase.removeChannel(channel);
      window.clearInterval(pollId);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchMessages = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching inbox messages:', error);
      return;
    }

    if (data) {
      setMessages(data);
      setUnreadCount(data.filter(m => !m.read).length);
    }
  };

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    
    if (!isOpen && unreadCount > 0) {
      // Mark all as read when opening
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from('inbox_messages')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false);
      
      fetchMessages();
    }
  };

  const handleDelete = async (messageId: string) => {
    const { error } = await supabase
      .from('inbox_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il messaggio",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Messaggio eliminato",
      description: "Il messaggio è stato rimosso dalla tua inbox",
    });

    fetchMessages();
    setDialogOpen(false);
  };

  const handleMessageClick = (message: InboxMessage) => {
    setSelectedMessage(message);
    setDialogOpen(true);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-12 w-12 rounded-full hover:scale-110 transition-all duration-300 group"
        onClick={handleOpen}
      >
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-rose-400 to-purple-500 rounded-lg opacity-20 group-hover:opacity-30 transition-opacity blur-sm" />
          
          {/* Mail icon */}
          <Mail className="h-6 w-6 text-pink-500 group-hover:text-rose-500 transition-colors relative z-10" />
        </div>
        
        {unreadCount > 0 && (
          <>
            {/* Pulsing glow effect */}
            <span className="absolute -top-1 -right-1 h-6 w-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full animate-ping opacity-75" />
            {/* Badge counter */}
            <span className="absolute -top-1 -right-1 h-6 w-6 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg border-2 border-background z-10">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[500px] overflow-hidden shadow-2xl border-2 border-primary/20 bg-gradient-to-b from-background via-background to-primary/5 z-50">
          <div className="sticky top-0 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500 text-white p-4 flex items-center gap-2 shadow-md">
            <Heart className="h-5 w-5 animate-pulse" />
            <h3 className="font-bold text-lg">Inbox</h3>
          </div>

          <div className="overflow-y-auto max-h-[400px] p-2">
            {messages.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">Nessun messaggio</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="group relative bg-card hover:bg-accent/50 border border-border rounded-lg p-4 transition-all hover:shadow-md cursor-pointer"
                    onClick={() => handleMessageClick(message)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <img src={loveableConnectIcon} alt="LoveableConnect" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-foreground truncate">
                            LoveableConnect
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), { 
                              addSuffix: true,
                              locale: it 
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(message.id);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                      {message.message}
                    </p>
                    {renderReward(message)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full flex items-center justify-center overflow-hidden">
                <img src={loveableConnectIcon} alt="LoveableConnect" className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="font-semibold">LoveableConnect</p>
                {selectedMessage && (
                  <p className="text-xs text-muted-foreground font-normal">
                    {formatDistanceToNow(new Date(selectedMessage.created_at), { 
                      addSuffix: true,
                      locale: it 
                    })}
                  </p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="bg-accent/30 rounded-lg p-4 border border-border">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {selectedMessage.message}
                </p>
              </div>
              {renderReward(selectedMessage)}
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => handleDelete(selectedMessage.id)}
              >
                <X className="h-4 w-4 mr-2" />
                Elimina messaggio
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
