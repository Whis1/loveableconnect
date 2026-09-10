import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { getStoredUserId } from "@/lib/storedSession";
import { withTimeout } from "@/lib/async";

interface DailyLikesData {
  likesRemaining: number;
  resetAt: string | null;
  isPremium: boolean;
  subscriptionType?: string;
  premiumTier?: string;
}

export const fetchDailyLikes = async (userId: string): Promise<DailyLikesData> => {
  if (!userId || userId !== getStoredUserId()) throw new Error("Sessione cambiata");

  const { data, error } = await withTimeout(supabase.rpc("check_and_reset_daily_likes", {
    _user_id: userId,
  }), 12000, "TIMEOUT_DAILY_LIKES");

  if (error) throw error;

  if (data && data.length > 0) {
    return {
      likesRemaining: data[0].likes_remaining,
      resetAt: data[0].reset_at,
      isPremium: data[0].is_premium,
      subscriptionType: data[0].subscription_type,
      premiumTier: data[0].premium_tier,
    };
  }

  throw new Error("Like giornalieri non disponibili");
};

export const useDailyLikes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  const { data: dailyLikesData, isLoading: loading, error, isFetching } = useQuery({
    queryKey: ["daily-likes", userId],
    queryFn: () => fetchDailyLikes(userId!),
    enabled: !!userId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000, // 30 secondi
    refetchInterval: (query) => query.state.data ? 60000 : 5000,
  });

  // 🚫 Realtime channel RIMOSSO (era ridondante con useCredits, entrambi
  //    monitoravano user_credits). Il polling di useQuery (refetchInterval:
  //    60s + invalidateQueries via useSendLike) è sufficiente. Risparmiamo
  //    1 channel per ogni componente che usa useDailyLikes.

  const consumeLike = async (
    useCredits: boolean = false
  ): Promise<{ success: boolean; creditsUsed: boolean }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, creditsUsed: false };

      const { data, error } = await supabase.rpc("consume_daily_like", {
        _user_id: user.id,
        _use_credits: useCredits,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];

        if (result.success) {
          if (result.credits_used) {
            toast({
              title: "Like inviato",
              description: "Hai usato 2 crediti per mettere questo like",
            });
          }

          queryClient.invalidateQueries({ queryKey: ["daily-likes"] });
          queryClient.invalidateQueries({ queryKey: ["user-credits"] });
          return { success: true, creditsUsed: result.credits_used };
        }
      }

      return { success: false, creditsUsed: false };
    } catch (error) {
      console.error("Error consuming like:", error);
      return { success: false, creditsUsed: false };
    }
  };

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["daily-likes"] });
  };

  return {
    likesRemaining: dailyLikesData?.likesRemaining ?? 0,
    hasData: !!dailyLikesData,
    error,
    isFetching,
    resetAt: dailyLikesData?.resetAt ?? null,
    isPremium: dailyLikesData?.isPremium ?? false,
    subscriptionType: dailyLikesData?.subscriptionType,
    premiumTier: dailyLikesData?.premiumTier,
    loading,
    consumeLike,
    refetch,
  };
};
