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

    try {
      const parsed = JSON.parse(session);
      setSessionInfo(parsed);
      fetchConversations();
      subscribeToUpdates();
    } catch (error) {
      console.error("Sessione non valida:", error);
      sessionStorage.removeItem("chattors_session");
      navigate("/chattors-login");
    }
  }, [navigate]);

  const fetchConversations = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "admin-secondary-get-conversations",
        { body: {} }
      );

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Errore nel recupero delle conversazioni");
      }

      setConversations(data.conversations || []);
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
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleLogout = () => {
    sessionStorage.removeItem("chattors_session");
    toast.success("Disconnesso");
    navigate("/chattors-login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
          onSelectConversation={setSelectedConversation}
          onRefresh={fetchConversations}
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
