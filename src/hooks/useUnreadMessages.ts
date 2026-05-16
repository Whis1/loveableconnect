import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UnreadCount {
  [matchId: string]: number;
}

export const useUnreadMessages = (userId: string | null) => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // Conta i messaggi non letti ricevuti dall'utente, raggruppati per match.
    const fetchUnreadCounts = async () => {
      const { data } = await supabase
        .from("messages")
        .select("match_id")
        .eq("receiver_id", userId)
        .eq("read", false);
      if (cancelled) return;
      const counts: UnreadCount = {};
      (data || []).forEach((m: { match_id: string }) => {
        counts[m.match_id] = (counts[m.match_id] || 0) + 1;
      });
      setUnreadCounts(counts);
    };

    fetchUnreadCounts();

    // Aggiornamento periodico: il badge resta allineato al database anche se la
    // consegna in tempo reale non funziona (es. dopo aver letto i messaggi).
    const interval = setInterval(fetchUnreadCounts, 10000);

    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          const newMessage = payload.new as { match_id: string };
          setUnreadCounts((prev) => ({
            ...prev,
            [newMessage.match_id]: (prev[newMessage.match_id] || 0) + 1,
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          // Un messaggio è cambiato (es. segnato come letto): ricalcola.
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getTotalUnread = () => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  };

  const getUnreadForMatch = (matchId: string) => {
    return unreadCounts[matchId] || 0;
  };

  return { unreadCounts, getTotalUnread, getUnreadForMatch };
};
