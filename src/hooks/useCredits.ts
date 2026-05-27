import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { getStoredUserId } from "@/lib/storedSession";
import { withTimeout } from "@/lib/async";
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

const fetchCredits = async (): Promise<UserCredits | null> => {
  // 🚨 BUG NOTO Supabase v2: auth.getSession() può piantarsi per minuti,
  // lasciando "Caricamento..." infinito sul pannello crediti.
  // FIX: leggi userId in modo SINCRONO da localStorage (stesso approccio
  // usato in deductCredits). Se non c'è, fallback a getSession con timeout.
  let userId = getStoredUserId();

  if (!userId) {
    try {
      const sessionResult = (await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT_GET_SESSION")), 4000)
        ),
      ])) as any;
      userId = sessionResult?.data?.session?.user?.id ?? null;
    } catch {
      // Timeout o errore: non possiamo recuperare l'utente
      return null;
    }
  }

  if (!userId) return null;

  // 🛡️ TIMEOUT su SELECT user_credits: se il token JWT è scaduto/corrotto
  // la query Supabase rest può restare in "pending" per minuti senza errore.
  // Il timeout 6s sblocca il loading anche in quel caso.
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
    existingCredits = (selectResult as any).data;
  } catch (e) {
    console.warn("⚠️ fetchCredits timeout su SELECT user_credits:", e);
    // 🛡️ Segnala al Connection Watchdog: se accumula 3 timeout in 15s
    //    scatena auto-recovery (kill channels + refresh JWT + re-fetch).
    reportSupabaseTimeout("fetchCredits");
    // Ritorniamo null così loading=false e l'UI non resta appesa.
    // Al prossimo refetch (5s dopo) ritenta automaticamente.
    return null;
  }

  if (!existingCredits) {
    await supabase.from("user_credits").insert({
      user_id: userId,
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

  // 🛡️ Anche la RPC check_and_reset_user_credits può rallentare: con timeout
  // fallback ai dati esistenti, così l'utente vede ALMENO i suoi crediti
  // anche se il reset giornaliero non parte (verrà fatto al prossimo fetch).
  let resetData: any[] | null = null;
  try {
    const rpcResult = (await Promise.race([
      supabase.rpc("check_and_reset_user_credits", { _user_id: userId }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT_RESET_CREDITS")), 5000)
      ),
    ])) as any;
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

  const { data: credits, isLoading: loading } = useQuery({
    queryKey: ["user-credits"],
    queryFn: fetchCredits,
    // 🛡️ Throttling aggressivo per evitare di saturare il backend:
    //    prima refetchInterval=5s + staleTime=0 → 12 query al minuto, se
    //    una query era lenta (es. 6s) si accumulava un backlog → timeout
    //    a cascata. Ora 30s/30s = 2 query/min, niente spam.
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    // 🔄 Mantieni i dati precedenti se la nuova query fallisce: niente
    //    skeleton vuoto se l'utente ha già visto un balance.
    placeholderData: (previousData) => previousData,
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
    refetch,
    deductCredits,
  };
};