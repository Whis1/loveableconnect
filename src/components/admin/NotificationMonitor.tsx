import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, Heart, MessageSquare, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface Notification {
  id: string;
  admin_profile_id: string;
  user_id: string;
  interaction_type: 'like' | 'message';
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

export const NotificationMonitor = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    try {
      let query = supabase
        .from("admin_notifications")
        .select(`
          *,
          user_profile:profiles!admin_notifications_user_id_fkey(nickname, avatar_url),
          admin_profile:profiles!admin_notifications_admin_profile_id_fkey(nickname)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter === 'unread') {
        query = query.eq('read', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data as any || []);
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
      .channel('admin_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
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
      const { error } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("id", notificationId);

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
      const { error } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("read", false);

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
      <CardHeader>
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {filter === 'unread' ? 'Nessuna notifica non letta' : 'Nessuna notifica'}
            </p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 ${
                    !notification.read ? 'bg-accent/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
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

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {notification.interaction_type === 'like' ? (
                          <Heart className="h-4 w-4 text-rose-500" fill="currentColor" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-semibold">
                          {notification.user_profile?.nickname || 'Utente sconosciuto'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {notification.interaction_type === 'like' 
                            ? 'ha messo like a'
                            : 'ha inviato un messaggio a'
                          }
                        </span>
                        <span className="font-semibold">
                          {notification.admin_profile?.nickname || 'Profilo admin'}
                        </span>
                      </div>

                      {notification.message_preview && (
                        <p className="text-sm text-muted-foreground italic">
                          "{notification.message_preview}"
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
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
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};