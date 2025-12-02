import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface Like {
  id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
}

const fetchUserLikes = async (): Promise<Set<string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return new Set();

  const { data, error } = await supabase
    .from("likes")
    .select("to_user_id")
    .eq("from_user_id", session.user.id);

  if (error) throw error;
  
  return new Set(data?.map(like => like.to_user_id) || []);
};

export const useLikes = () => {
  const queryClient = useQueryClient();

  const { data: likedProfileIds = new Set(), isLoading, error } = useQuery({
    queryKey: ["user-likes"],
    queryFn: fetchUserLikes,
    staleTime: 30 * 1000, // 30 secondi
    refetchInterval: 60 * 1000, // Ricarica ogni minuto
  });

  // Realtime updates per i like
  useEffect(() => {
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) return;

      const channel = supabase
        .channel("user_likes_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "likes",
            filter: `from_user_id=eq.${session.user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["user-likes"] });
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
    likedProfileIds,
    loading: isLoading,
    error,
  };
};
