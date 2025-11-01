import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ChatsList } from "@/components/admin/ChatsList";
import { ChatView } from "@/components/admin/ChatView";

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

const Chats = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
      return;
    }

    if (isAdmin) {
      fetchConversations();
      subscribeToUpdates();
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchConversations = async () => {
    try {
      setLoading(true);

      // Ottieni tutte le notifiche di tipo messaggio
      const { data: notifications, error: notifError } = await supabase
        .from("admin_notifications")
        .select("admin_profile_id, user_id")
        .eq("interaction_type", "message")
        .order("created_at", { ascending: false });

      if (notifError) throw notifError;

      // Raggruppa per conversazioni uniche
      const uniqueConversations = new Map<string, any>();
      
      for (const notif of notifications || []) {
        const key = `${notif.admin_profile_id}-${notif.user_id}`;
        if (!uniqueConversations.has(key)) {
          uniqueConversations.set(key, notif);
        }
      }

      // Carica i dettagli di ogni conversazione
      const conversationsData: Conversation[] = [];

      for (const notif of uniqueConversations.values()) {
        // Ottieni il match
        const { data: match } = await supabase
          .from("matches")
          .select("id")
          .or(`user1_id.eq.${notif.admin_profile_id},user2_id.eq.${notif.admin_profile_id}`)
          .or(`user1_id.eq.${notif.user_id},user2_id.eq.${notif.user_id}`)
          .maybeSingle();

        if (!match) continue;

        // Ottieni i profili
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("nickname, avatar_url")
          .eq("id", notif.user_id)
          .single();

        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("id", notif.admin_profile_id)
          .single();

        // Conta messaggi non letti
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("match_id", match.id)
          .eq("receiver_id", notif.admin_profile_id)
          .eq("read", false);

        // Ottieni ultimo messaggio
        const { data: lastMessage } = await supabase
          .from("messages")
          .select("created_at")
          .eq("match_id", match.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        conversationsData.push({
          userId: notif.user_id,
          userNickname: userProfile?.nickname || "Utente",
          userAvatar: userProfile?.avatar_url || null,
          adminProfileId: notif.admin_profile_id,
          adminNickname: adminProfile?.nickname || "Admin",
          matchId: match.id,
          lastMessageAt: lastMessage?.created_at || new Date().toISOString(),
          unreadCount: count || 0,
        });
      }

      // Ordina per ultimo messaggio
      conversationsData.sort((a, b) => 
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      setConversations(conversationsData);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel("chats_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/profiles")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Messaggi Admin</h1>
            <p className="text-sm text-muted-foreground">
              Gestisci le conversazioni con gli utenti
            </p>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-81px)]">
        <ChatsList
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
        />
        
        <ChatView
          conversation={selectedConversation}
          onRefresh={fetchConversations}
        />
      </div>
    </div>
  );
};

export default Chats;
