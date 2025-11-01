import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, LogOut } from "lucide-react";
import { ChatsList } from "@/components/admin/ChatsList";
import { ChatView } from "@/components/admin/ChatView";
import { toast } from "sonner";

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    // Verifica sessione chattors
    const session = sessionStorage.getItem("chattors_session");
    if (!session) {
      navigate("/chattors-login");
      return;
    }

    let cleanup: (() => void) | undefined;

    try {
      const parsed = JSON.parse(session);
      setSessionInfo(parsed);
      // Avvia fetch in background senza bloccare la UI
      fetchConversations(false);
      cleanup = subscribeToUpdates();
    } catch (error) {
      console.error("Sessione non valida:", error);
      sessionStorage.removeItem("chattors_session");
      navigate("/chattors-login");
    }

    return () => {
      cleanup?.();
    };
  }, [navigate]);

  // Polling di backup ogni 3s per garantire aggiornamento quasi realtime
  useEffect(() => {
    const session = sessionStorage.getItem("chattors_session");
    if (!session) return;
    const id = setInterval(() => fetchConversations(true), 3000);
    return () => clearInterval(id);
  }, []);

  const fetchConversations = async (silent = true) => {
    try {
      if (!silent) setLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "admin-secondary-get-conversations",
        { body: {} }
      );

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Errore nel recupero delle conversazioni");
      }

      const list = data.conversations || [];
      const sorted = [...list].sort(
        (a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
       setConversations(() => {
         if (!selectedConversation) return sorted;
         // Mantieni in lista la conversazione selezionata anche se non arriva dal server (es. archiviata con 0 non letti)
         const exists = sorted.some(
           (c: any) =>
             c.matchId === selectedConversation.matchId &&
             c.userId === selectedConversation.userId
         );
         const merged = exists
           ? sorted.map((c: any) =>
               c.matchId === selectedConversation.matchId && c.userId === selectedConversation.userId
                 ? { ...c, unreadCount: 0 }
                 : c
             )
           : [{ ...selectedConversation, unreadCount: 0 }, ...sorted];
         return merged.sort(
           (a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
         );
       });
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Errore nel caricamento delle conversazioni");
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
          // Nuovo messaggio o lettura: aggiorna lista e ordinamento
          fetchConversations(true);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "matches",
        },
        () => {
          fetchConversations(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setConversations((prev) =>
      prev.map((c) =>
        c.matchId === conv.matchId && c.userId === conv.userId
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
  };

  const handleLogout = () => {
    sessionStorage.removeItem("chattors_session");
    toast.success("Disconnesso");
    navigate("/chattors-login");
  };

  // Verifica sessione - se non c'è redirect subito
  if (!sessionInfo) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
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
                Connesso come: {sessionInfo?.nickname}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-81px)]">
        <ChatsList
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          onRefresh={fetchConversations}
          onArchived={(conv) => {
            if (
              selectedConversation &&
              selectedConversation.matchId === conv.matchId &&
              selectedConversation.userId === conv.userId
            ) {
              setSelectedConversation(null);
            }
          }}
          loading={loading}
        />
        
        <ChatView
          conversation={selectedConversation}
          onRefresh={fetchConversations}
          chattorsNickname={sessionInfo?.nickname}
        />
      </div>
    </div>
  );
};

export default Chats;
