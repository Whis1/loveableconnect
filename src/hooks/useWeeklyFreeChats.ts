import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface FreeChatsData {
  chatsRemaining: number;
  resetAt: string | null;
}

const fetchFreeChats = async (): Promise<FreeChatsData | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("check_and_reset_daily_free_chats", {
    _user_id: user.id,
  });

  if (error) throw error;

  if (data && data.length > 0) {
    return {
      chatsRemaining: data[0].chats_remaining,
      resetAt: data[0].reset_at,
    };
  }

  return null;
};

export const useWeeklyFreeChats = () => {
  const queryClient = useQueryClient();

  const { data: freeChatsData, isLoading: loading } = useQuery({
    queryKey: ["weekly-free-chats"],
    queryFn: fetchFreeChats,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const channel = supabase
          .channel("free-chats-changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "user_credits",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              queryClient.invalidateQueries({ queryKey: ["weekly-free-chats"] });
            }
          )
          .subscribe();

        return channel;
      }
      return null;
    };

    let channel: any;
    setupSubscription().then((ch) => {
      channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  const consumeFreeChat = async (): Promise<{ success: boolean; chatsRemaining: number }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, chatsRemaining: 0 };

      const { data, error } = await supabase.rpc("consume_free_chat", {
        _user_id: user.id,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        queryClient.invalidateQueries({ queryKey: ["weekly-free-chats"] });
        return { success: result.success, chatsRemaining: result.chats_remaining };
      }

      return { success: false, chatsRemaining: 0 };
    } catch (error) {
      console.error("Error consuming free chat:", error);
      return { success: false, chatsRemaining: 0 };
    }
  };

  return {
    chatsRemaining: freeChatsData?.chatsRemaining ?? 0,
    resetAt: freeChatsData?.resetAt ?? null,
    loading,
    consumeFreeChat,
  };
};
