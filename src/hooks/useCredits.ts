import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { getStoredUserId } from "@/lib/storedSession";

interface UserCredits {
  balance: number;
  is_premium: boolean;
  last_daily_reset: string;
  premium_expires_at?: string | null;
  credits_depleted_at?: string | null;
  daily_likes_remaining?: number;
  daily_likes_reset_at?: string | null;
  subscription_type?: string;
  premium_tier?: string;
}

const fetchCredits = async (): Promise<UserCredits | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: existingCredits } = await supabase
    .from("user_credits")
    .select("balance, is_premium, last_daily_reset, premium_expires_at, credits_depleted_at, daily_likes_remaining, daily_likes_reset_at, subscription_type, premium_tier")
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
      subscription_type: 'none',
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
      subscription_type: existingCredits.subscription_type,
      premium_tier: existingCredits.premium_tier,
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
    staleTime: 0, // Sempre aggiornato
    refetchInterval: 5 * 1000, // Ricontrolla ogni 5 secondi per reattività immediata
    refetchOnWindowFocus: true, // Aggiorna quando torna il focus
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
      // Leggiamo l'id utente in modo SINCRONO dal localStorage invece di
      // chiamare supabase.auth.getSession(): quella chiamata su Supabase v2
      // ogni tanto si pianta per minuti e bloccava completamente l'invio
      // del messaggio (il modo classico in cui si manifestava il bug era
      // "non mi fa inviare messaggi se non ricarico la pagina").
      const userId = getStoredUserId();
      if (!userId) {
        console.warn('deductCredits: nessuna sessione utente trovata in localStorage');
        return false;
      }

      // Timeout: se l'RPC non risponde entro 6 secondi, niente messaggio
      // bloccato all'infinito. L'utente vedra' un toast e potra' riprovare.
      const result = (await Promise.race([
        supabase.rpc("deduct_message_credits", { _user_id: userId }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT_DEDUCT_MESSAGE_CREDITS')), 6000)
        ),
      ])) as { data: boolean | null; error: unknown };

      if (result.error) throw result.error;
      if (!result.data) {
        return false;
      }

      queryClient.invalidateQueries({ queryKey: ["user-credits"] });
      return true;
    } catch (error: any) {
      console.error("Error deducting credits:", error);
      const msg = typeof error?.message === 'string' ? error.message : '';
      toast({
        title: "Errore",
        description: msg.startsWith('TIMEOUT_')
          ? "Il server e' lento a rispondere. Riprova tra qualche secondo."
          : "Impossibile detrarre i crediti",
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