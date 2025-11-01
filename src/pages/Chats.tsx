import { useEffect, useRef, useState } from "react";
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
  const keepInListRef = useRef<Set<string>>(new Set());
  const storageKeyRef = useRef<string>("keep_conversations_default");
  const persistKeepSet = () => {
    try {
      localStorage.setItem(
        storageKeyRef.current,
        JSON.stringify(Array.from(keepInListRef.current))
      );
    } catch (e) {
      console.error("Persistenza keepInList fallita:", e);
    }
  };
  // Dati persistiti per le conversazioni fissate
  const storageDataKeyRef = useRef<string>("keep_conversations_data_default");
  const keepDataRef = useRef<Record<string, Conversation>>({});
  const persistKeepData = () => {
    try {
      localStorage.setItem(
        storageDataKeyRef.current,
        JSON.stringify(keepDataRef.current)
      );
    } catch (e) {
      console.error("Persistenza keepData fallita:", e);
    }
  };

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
      // Inizializza storage keys e carica le conversazioni fissate da localStorage
      storageKeyRef.current = `keep_conversations_${parsed?.nickname || 'default'}`;
      storageDataKeyRef.current = `keep_conversations_data_${parsed?.nickname || 'default'}`;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKeyRef.current) || '[]');
        if (Array.isArray(saved)) {
          keepInListRef.current = new Set(saved);
        }
      } catch (e) {
        console.error('Errore caricamento conversazioni fissate:', e);
      }
      try {
        const savedDataRaw = localStorage.getItem(storageDataKeyRef.current) || '{}';
        const savedData = JSON.parse(savedDataRaw);
        if (savedData && typeof savedData === 'object') {
          keepDataRef.current = savedData;
        }
      } catch (e) {
        console.error('Errore caricamento dati conversazioni fissate:', e);
      }
      // Mostra subito le conversazioni fissate salvate in locale
      const initial = Object.values(keepDataRef.current || {});
      if (initial.length > 0) {
        setConversations(
          initial.sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        );
      }
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
      // Aggiungi tutte le conversazioni arrivate dal server al set e ai dati persistenti
      const keep = keepInListRef.current;
      const keepData = keepDataRef.current;
      sorted.forEach((c: any) => {
        const key = `${c.matchId}-${c.userId}`;
        keep.add(key);
        keepData[key] = c;
      });
      persistKeepSet();
      persistKeepData();
       setConversations((prev) => {
         const keepSet = keepInListRef.current;
         // Parti dalle conversazioni dal server
         let result = [...sorted];
         
         // Per ogni conversazione "da mantenere", se non è già in result, aggiungila
         const resultKeys = new Set(result.map((c: any) => `${c.matchId}-${c.userId}`));
         const toAdd: Conversation[] = [];
         
         // Aggiungi dal data persistito (localStorage)
         for (const key of keepSet) {
           if (!resultKeys.has(key)) {
             const pinned = keepDataRef.current[key];
             if (pinned) {
               toAdd.push({ ...pinned, unreadCount: 0 });
               resultKeys.add(key);
             }
           }
         }
         
         // Backfill anche dallo stato precedente nel caso manchino dati persistiti
         prev.forEach((c) => {
           const key = `${c.matchId}-${c.userId}`;
           if (keepSet.has(key) && !resultKeys.has(key)) {
             toAdd.push({ ...c, unreadCount: 0 });
             resultKeys.add(key);
           }
         });
         
         result = [...toAdd, ...result];
         
         // Marca come letta la conversazione selezionata
         if (selectedConversation) {
           result = result.map((c: any) =>
             c.matchId === selectedConversation.matchId && c.userId === selectedConversation.userId
               ? { ...c, unreadCount: 0 }
               : c
           );
         }
         
         return result.sort(
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
    // Aggiungi questa conversazione al set di quelle da mantenere in lista
    const key = `${conv.matchId}-${conv.userId}`;
    keepInListRef.current.add(key);
    persistKeepSet();
    keepDataRef.current[key] = conv;
    persistKeepData();
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
            // Rimuovi la conversazione dal set delle "da mantenere"
            const key = `${conv.matchId}-${conv.userId}`;
            keepInListRef.current.delete(key);
            persistKeepSet();
            delete keepDataRef.current[key];
            persistKeepData();
            
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
