import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
}

const fetchMatches = async (): Promise<Match[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`);

  if (error) throw error;
  return data || [];
};

export const useMatches = () => {
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading, error } = useQuery({
    queryKey: ["matches"],
    queryFn: fetchMatches,
    staleTime: 5 * 60 * 1000, // 5 minuti
    gcTime: 30 * 60 * 1000, // 30 minuti in cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Realtime updates per i matches
  useEffect(() => {
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session?.user) return;

      const channel = supabase
        .channel("user_matches_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "matches",
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["matches"] });
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
    matches,
    loading: isLoading,
    error,
  };
};
