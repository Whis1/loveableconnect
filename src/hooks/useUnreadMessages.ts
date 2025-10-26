import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UnreadCount {
  [matchId: string]: number;
}

export const useUnreadMessages = (userId: string | null) => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});

  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCounts = async () => {
      // Get all matches for the user
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (!matches) return;

      // For each match, count unread messages
      const counts: UnreadCount = {};
      
      await Promise.all(
        matches.map(async (match) => {
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("match_id", match.id)
            .eq("receiver_id", userId)
            .eq("read", false);

          counts[match.id] = count || 0;
        })
      );

      setUnreadCounts(counts);
    };

    fetchUnreadCounts();

    // Subscribe to new messages
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
          const newMessage = payload.new as any;
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
        (payload) => {
          const updatedMessage = payload.new as any;
          if (updatedMessage.read) {
            setUnreadCounts((prev) => ({
              ...prev,
              [updatedMessage.match_id]: Math.max(0, (prev[updatedMessage.match_id] || 0) - 1),
            }));
          }
        }
      )
      .subscribe();

    return () => {
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
