import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, Heart, MessageSquare, Check, Trash2, LogIn, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface Notification {
  id: string;
  admin_profile_id: string;
  user_id: string;
  interaction_type: 'like' | 'message' | 'login' | 'logout';
  message_preview?: string;
  created_at: string;
  read: boolean;
  user_profile?: {
    nickname: string;
    avatar_url?: string;
  };
  admin_profile?: {
    nickname: string;
  };
}

const DUPLICATE_WINDOW_MS = 15_000;

const notificationKey = (notification: Notification) => [
  notification.admin_profile_id,
  notification.user_id,
  notification.interaction_type,
  notification.message_preview ?? "",
].join("|");

const dedupeNotifications = (items: Notification[]) => {
  const deduped: Notification[] = [];

  [...items]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .forEach((notification) => {
      const currentTime = new Date(notification.created_at).getTime();
      const existing = deduped.find((candidate) => {
        if (notificationKey(candidate) !== notificationKey(notification)) return false;
        const candidateTime = new Date(candidate.created_at).getTime();
        return Math.abs(candidateTime - currentTime) <= DUPLICATE_WINDOW_MS;
      });

      if (existing) {
        existing.read = existing.read && notification.read;
        return;
      }

      deduped.push({ ...notification });
    });

  return deduped;
};

const getNotificationIcon = (type: Notification["interaction_type"]) => {
  if (type === "like") {
    return <Heart className="h-3.5 w-3.5 text-rose-500" fill="currentColor" />;
  }

  if (type === "message") {
    return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />;
  }

  if (type === "login") {
    return <LogIn className="h-3.5 w-3.5 text-emerald-400" />;
  }

  return <LogOut className="h-3.5 w-3.5 text-slate-400" />;
};

const getNotificationText = (notification: Notification) => {
  if (notification.interaction_type === "like") {
    return {
      action: "ha messo like a",
      target: notification.admin_profile?.nickname || "Profilo admin",
    };
  }

  if (notification.interaction_type === "message") {
    return {
      action: "ha scritto a",
      target: notification.admin_profile?.nickname || "Profilo admin",
    };
  }

  if (notification.interaction_type === "login") {
    return {
      action: "è entrato online",
      target: "",
    };
  }

  return {
    action: "è uscito offline",
    target: "",
  };
};

export const NotificationMonitor = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-notifications', {
        body: { filter }
      });

      if (error) throw error;
      setNotifications(dedupeNotifications((data as any)?.notifications || []));
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le notifiche",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Sottoscrizione realtime per nuove notifiche
    const channel = supabase
      .channel('admin_notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          console.log('Nuova notifica ricevuta:', payload);
          fetchNotifications();
          
          // Mostra toast per nuova notifica
          toast({
            title: "Nuova notifica",
            description: "Hai ricevuto una nuova interazione",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'admin_notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'admin_notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-notifications-mark-read', {
        body: { id: notificationId }
      });

      if (error) throw error;

      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));

      toast({
        title: "Notifica letta",
        description: "La notifica è stata contrassegnata come letta",
      });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la notifica",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-notifications-mark-all-read');

      if (error) throw error;

      setNotifications(notifications.map(n => ({ ...n, read: true })));

      toast({
        title: "Tutte le notifiche lette",
        description: "Tutte le notifiche sono state contrassegnate come lette",
      });
    } catch (error: any) {
      console.error("Error marking all as read:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare le notifiche",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAll = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-notifications-delete-all');

      if (error) throw error;

      setNotifications([]);

      toast({
        title: "Notifiche eliminate",
        description: "Tutte le notifiche sono state eliminate",
      });
    } catch (error: any) {
      console.error("Error deleting all notifications:", error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare le notifiche",
        variant: "destructive",
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Caricamento notifiche...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifiche Interazioni
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Tutte
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Non lette
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
              >
                <Check className="h-4 w-4 mr-2" />
                Segna tutte
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteAll}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina tutte
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[600px] pr-4">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {filter === 'unread' ? 'Nessuna notifica non letta' : 'Nessuna notifica'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {notifications.map((notification) => {
                const text = getNotificationText(notification);

                return (
                <div
                  key={notification.id}
                  className={`border rounded-md px-3 py-2 ${
                    !notification.read ? 'bg-accent/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 shrink-0">
                      {notification.user_profile?.avatar_url ? (
                        <AvatarImage 
                          src={supabase.storage
                            .from('profile-images')
                            .getPublicUrl(notification.user_profile.avatar_url).data.publicUrl}
                        />
                      ) : null}
                      <AvatarFallback>
                        {notification.user_profile?.nickname?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5 text-sm leading-tight">
                        <span className="shrink-0">{getNotificationIcon(notification.interaction_type)}</span>
                        <span className="max-w-[120px] truncate font-semibold">
                          {notification.user_profile?.nickname || 'Utente sconosciuto'}
                        </span>
                        <span className="truncate text-muted-foreground">
                          {text.action}
                        </span>
                        {text.target && (
                          <span className="max-w-[120px] truncate font-semibold">
                            {text.target}
                          </span>
                        )}
                      </div>

                      {notification.message_preview && (
                        <p className="truncate text-xs text-muted-foreground italic">
                          "{notification.message_preview}"
                        </p>
                      )}

                      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: it,
                        })}
                      </p>
                    </div>

                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 shrink-0 p-0"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
