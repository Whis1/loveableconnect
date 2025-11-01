import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface InboxMessage {
  id: string;
  message: string;
  created_at: string;
  read: boolean;
}

export const InboxDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
    
    // Realtime subscription
    const channel = supabase
      .channel('inbox-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inbox_messages',
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-primary/10 transition-colors"
        onClick={handleOpen}
      >
        <Mail className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
            {unreadCount}
          </span>
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
                    className="group relative bg-card hover:bg-accent/50 border border-border rounded-lg p-4 transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <Heart className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-foreground truncate">
                            LoveableConnect Manager
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
                        onClick={() => handleDelete(message.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
                      {message.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
