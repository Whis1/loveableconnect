import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";

const fetchUserLikes = async (userId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from("likes")
    .select("to_user_id")
    .eq("from_user_id", userId);

  if (error) throw error;

  return new Set(data?.map((like) => like.to_user_id) || []);
};

export const useLikes = () => {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const emptyLikedProfileIds = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    let isMounted = true;

    const initializeUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      setUserId(session?.user?.id ?? null);
      setAuthReady(true);
    };

    initializeUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      const nextUserId = session?.user?.id ?? null;
      setUserId(nextUserId);
      setAuthReady(true);

      if (!nextUserId) {
        queryClient.removeQueries({ queryKey: ["user-likes"] });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["user-likes", nextUserId] });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["user-likes", userId],
    queryFn: () => fetchUserLikes(userId as string),
    enabled: authReady && !!userId,
    staleTime: 0,
    refetchInterval: 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const likedProfileIds = data ?? emptyLikedProfileIds;

  useEffect(() => {
    if (!authReady || !userId) return;

    const channel = supabase
      .channel(`user_likes_changes_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "likes",
          filter: `from_user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-likes", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return {
    likedProfileIds,
    loading: !authReady || (!!userId && isLoading),
    error,
  };
};
