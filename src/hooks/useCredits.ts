import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { getStoredUserId } from "@/lib/storedSession";
import { TimeoutError, withTimeout } from "@/lib/async";
import { reportSupabaseTimeout } from "@/hooks/useConnectionWatchdog";

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

export const fetchCredits = async (userId: string): Promise<UserCredits> => {
  // Inactive cached queries must not load or reset a previous account's data.
  if (!userId || userId !== getStoredUserId()) throw new Error("Sessione cambiata");

  // Bound the request so a stalled read can be retried by React Query.
  let existingCredits: any = null;
  try {
    const selectResult = await withTimeout(
      supabase
        .from("user_credits")
        .select("balance, is_premium, last_daily_reset, premium_expires_at, credits_depleted_at, daily_likes_remaining, daily_likes_reset_at, subscription_type, premium_tier")
        .eq("user_id", userId)
        .maybeSingle(),
      12000, // 12s: backend Lovable Cloud Supabase sotto carico
      "TIMEOUT_SELECT_USER_CREDITS"
    );
    if (selectResult.error) throw selectResult.error;
    existingCredits = selectResult.data;
  } catch (e) {
    console.warn("fetchCredits: lettura saldo fallita", e);
    if (e instanceof TimeoutError) reportSupabaseTimeout("fetchCredits");
    // Reject: React Query retries and preserves the last successful balance.
    throw e;
  }

  if (!existingCredits) {
    const { error } = await withTimeout(supabase.from("user_credits").insert({
      user_id: userId,
      balance: 10,
    }), 12000);
    // A concurrent initialization may already have created the row.
    if (error && error.code !== "23505") throw error;
    const result = await withTimeout(supabase.from("user_credits")
      .select("*").eq("user_id", userId).single(), 12000);
    if (result.error) throw result.error;
    if (!result.data) throw new Error("Saldo non disponibile");
    existingCredits = result.data;
  }

  // 🛡️ SCADENZA PREMIUM (rete di sicurezza in tempo reale).
  // Se il premium risulta ancora attivo (is_premium) ma la data di scadenza è
  // passata, il DB non è stato ancora ripulito (il cron/webhook non sono
  // passati): forziamo subito il reset a Free tramite RPC SECURITY DEFINER
  // (crediti 10 / like 5 + rimozione tema). Così l'utente NON resta con i 999
  // crediti e il tema premium dopo la scadenza, senza dover ricaricare.
  if (
    existingCredits.is_premium &&
    existingCredits.premium_expires_at &&
    new Date(existingCredits.premium_expires_at).getTime() < Date.now()
  ) {
    try {
      const { data: didReset, error } = await withTimeout(
        supabase.rpc("enforce_premium_expiry" as never), 12000
      );
      if (error) throw error;
      if (didReset) {
        return {
          balance: 10,
          is_premium: false,
          last_daily_reset: existingCredits.last_daily_reset ?? new Date().toISOString(),
          premium_expires_at: null,
          credits_depleted_at: null,
          daily_likes_remaining: 5,
          daily_likes_reset_at: existingCredits.daily_likes_reset_at ?? null,
          subscription_type: "none",
          premium_tier: "none",
        };
      }
    } catch (e) {
      console.warn("enforce_premium_expiry failed:", e);
    }
  }

  // 🛡️ Anche la RPC check_and_reset_user_credits può rallentare: con timeout
  // fallback ai dati esistenti, così l'utente vede ALMENO i suoi crediti
  // anche se il reset giornaliero non parte (verrà fatto al prossimo fetch).
  let resetData: any[] | null = null;
  try {
    const rpcResult = await withTimeout(
      supabase.rpc("check_and_reset_user_credits", { _user_id: userId }),
      5000, "TIMEOUT_RESET_CREDITS"
    );
    resetData = rpcResult?.data ?? null;
  } catch {
    resetData = null;
  }

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
  const userId = useCurrentUserId();

  const { data: credits, isLoading: loading, error, isFetching } = useQuery({
    queryKey: ["user-credits", userId],
    queryFn: () => fetchCredits(userId!),
    enabled: !!userId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    refetchOnMount: "always",
    // Retry missing data promptly; poll successful balances less frequently.
    staleTime: 30 * 1000,
    refetchInterval: (query) => query.state.data ? 30000 : 5000,
    refetchOnWindowFocus: true,
  });

  // 🚫 Realtime channel RIMOSSO per ridurre i channel attivi a runtime.
  //    Il polling di useQuery (refetchInterval: 30s + refetchOnWindowFocus)
  //    è sufficiente per aggiornare il balance. Un cambio crediti si vede al
  //    massimo dopo 30s anziché istante, ma in cambio liberiamo connection pool
  //    (1 channel in meno × ogni mount di Dashboard/CreditsDisplay = molti meno
  //    channel zombie accumulati durante la navigazione).

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
    error,
    isFetching,
    refetch,
    deductCredits,
  };
};
