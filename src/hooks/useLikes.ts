import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    let isMounted = true;

    const initializeUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (isMounted) {
        setUserId(session?.user?.id ?? null);
      }
    };

    initializeUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      queryClient.invalidateQueries({ queryKey: ["user-likes"] });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const { data: likedProfileIds = new Set(), isLoading, error } = useQuery({
    queryKey: ["user-likes", userId],
    queryFn: () => fetchUserLikes(userId as string),
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  useEffect(() => {
    if (!userId) return;

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
    loading: isLoading,
    error,
  };
};
