import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Prefetch all common data at app startup for instant navigation
export const useAppPrefetch = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const prefetchAllData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;

      // Prefetch in parallelo per velocità massima
      await Promise.all([
        // Profili (per explore, search, etc.)
        queryClient.prefetchQuery({
          queryKey: ["profiles"],
          queryFn: async () => {
            const { data } = await supabase
              .from("profiles")
              .select("*")
              .neq("id", userId)
              .order("last_active", { ascending: false });
            return data || [];
          },
          staleTime: 10 * 60 * 1000,
        }),

        // Like inviati
        queryClient.prefetchQuery({
          queryKey: ["user-likes"],
          queryFn: async () => {
            const { data } = await supabase
              .from("likes")
              .select("to_user_id")
              .eq("from_user_id", userId);
            return new Set(data?.map(like => like.to_user_id) || []);
          },
          staleTime: 5 * 60 * 1000,
        }),

        // Like ricevuti (per pagina likes)
        queryClient.prefetchQuery({
          queryKey: ["received-likes"],
          queryFn: async () => {
            const { data } = await supabase
              .from("likes")
              .select("id, from_user_id, created_at")
              .eq("to_user_id", userId)
              .order("created_at", { ascending: false });
            return data || [];
          },
          staleTime: 5 * 60 * 1000,
        }),

        // Matches
        queryClient.prefetchQuery({
          queryKey: ["matches"],
          queryFn: async () => {
            const { data } = await supabase
              .from("matches")
              .select("*")
              .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
            return data || [];
          },
          staleTime: 5 * 60 * 1000,
        }),

        // Profilo corrente
        queryClient.prefetchQuery({
          queryKey: ["current-profile", userId],
          queryFn: async () => {
            const { data } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", userId)
              .single();
            return data;
          },
          staleTime: 10 * 60 * 1000,
        }),

        // Crediti utente
        queryClient.prefetchQuery({
          queryKey: ["user-credits"],
          queryFn: async () => {
            const { data } = await supabase
              .from("user_credits")
              .select("*")
              .eq("user_id", userId)
              .maybeSingle();
            return data;
          },
          staleTime: 2 * 60 * 1000,
        }),
      ]);
    };

    prefetchAllData();
  }, [queryClient]);
};
