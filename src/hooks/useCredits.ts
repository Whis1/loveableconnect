import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface UserCredits {
  balance: number;
  is_premium: boolean;
  last_daily_reset: string;
  premium_expires_at?: string | null;
  credits_depleted_at?: string | null;
  daily_likes_remaining?: number;
  daily_likes_reset_at?: string | null;
}

const fetchCredits = async (): Promise<UserCredits | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: existingCredits } = await supabase
    .from("user_credits")
    .select("balance, is_premium, last_daily_reset, premium_expires_at, credits_depleted_at, daily_likes_remaining, daily_likes_reset_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!existingCredits) {
    await supabase.from("user_credits").insert({
      user_id: session.user.id,
      balance: 26,
    });
    return {
      balance: 26,
      is_premium: false,
      last_daily_reset: new Date().toISOString(),
      premium_expires_at: null,
      credits_depleted_at: null,
      daily_likes_remaining: 8,
      daily_likes_reset_at: null,
    };
  }

  const { data: resetData } = await supabase.rpc(
    "check_and_reset_user_credits",
    { _user_id: session.user.id }
  );

  if (resetData && resetData.length > 0) {
    const updated = resetData[0];
    return {
      balance: updated.balance,
      is_premium: updated.is_premium,
      last_daily_reset: updated.last_daily_reset,
      premium_expires_at: existingCredits.premium_expires_at,
      credits_depleted_at: existingCredits.credits_depleted_at,
      daily_likes_remaining: existingCredits.daily_likes_remaining,
      daily_likes_reset_at: existingCredits.daily_likes_reset_at,
    };
  }

  return existingCredits as UserCredits;
};

export const useCredits = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: credits, isLoading: loading } = useQuery({
    queryKey: ["user-credits"],
    queryFn: fetchCredits,
    staleTime: 30 * 1000, // 30 secondi - i crediti cambiano spesso
    refetchInterval: 60 * 1000, // Ricontrolla ogni minuto
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("user_credits_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_credits",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-credits"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const deductCredits = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const { data, error } = await supabase.rpc("deduct_message_credits", {
        _user_id: session.user.id,
      });

      if (error) throw error;

      if (!data) {
        return false;
      }

      queryClient.invalidateQueries({ queryKey: ["user-credits"] });
      return true;
    } catch (error: any) {
      console.error("Error deducting credits:", error);
      toast({
        title: "Errore",
        description: "Impossibile detrarre i crediti",
        variant: "destructive",
      });
      return false;
    }
  };

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["user-credits"] });
  };

  return {
    credits,
    loading,
    refetch,
    deductCredits,
  };
};