import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface DailyLikesData {
  likesRemaining: number;
  resetAt: string | null;
  isPremium: boolean;
  subscriptionType?: string;
  premiumTier?: string;
}

const fetchDailyLikes = async (): Promise<DailyLikesData | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("check_and_reset_daily_likes", {
    _user_id: user.id,
  });

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

  return null;
};

export const useDailyLikes = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dailyLikesData, isLoading: loading } = useQuery({
    queryKey: ["daily-likes"],
    queryFn: fetchDailyLikes,
    staleTime: 30 * 1000, // 30 secondi
    refetchInterval: 60 * 1000, // Ricontrolla ogni minuto
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
    likesRemaining: dailyLikesData?.likesRemaining ?? 8,
    resetAt: dailyLikesData?.resetAt ?? null,
    isPremium: dailyLikesData?.isPremium ?? false,
    subscriptionType: dailyLikesData?.subscriptionType,
    premiumTier: dailyLikesData?.premiumTier,
    loading,
    consumeLike,
    refetch,
  };
};
