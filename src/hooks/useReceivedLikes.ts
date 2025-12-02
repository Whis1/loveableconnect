import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface ReceivedLike {
  id: string;
  from_user_id: string;
  created_at: string;
}

const fetchReceivedLikes = async (): Promise<ReceivedLike[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from("likes")
    .select("id, from_user_id, created_at")
    .eq("to_user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const useReceivedLikes = () => {
  const queryClient = useQueryClient();

  const { data: receivedLikes = [], isLoading, error } = useQuery({
    queryKey: ["received-likes"],
    queryFn: fetchReceivedLikes,
    staleTime: 5 * 60 * 1000, // 5 minuti
    gcTime: 30 * 60 * 1000, // 30 minuti in cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Realtime updates per i like ricevuti
  useEffect(() => {
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) return;

      const channel = supabase
        .channel("received_likes_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "likes",
            filter: `to_user_id=eq.${session.user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["received-likes"] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });

    return () => {
      authSubscription?.unsubscribe();
    };
  }, [queryClient]);

  return {
    receivedLikes,
    loading: isLoading,
    error,
  };
};
