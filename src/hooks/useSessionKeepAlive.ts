import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * 🩺 Session keep-alive globale.
 *
 * Risolve il bug del "Caricamento infinito" su pannelli (crediti, profilo,
 * ecc.) causato da JWT scaduto/corrotto. Senza questo hook, l'utente che
 * lascia la tab aperta a lungo (o naviga molto fra pagine) può ritrovarsi
 * con il token Supabase non più valido: le query partono ma il backend non
 * risponde mai → loading infinito.
 *
 * Strategia:
 *   1. **Refresh proattivo** ogni 4 minuti: forza un nuovo access_token
 *      ben prima della scadenza (default 1h). Tipico Supabase JWT.
 *   2. **Refresh on focus/visibility**: quando l'utente torna sulla tab
 *      dopo essere stato altrove, rinfresca subito.
 *   3. **Cache invalidation** dopo ogni refresh: forza React Query a
 *      ri-eseguire le query con il nuovo token.
 *
 * Idempotente: se non c'è sessione (utente non loggato), non fa nulla.
 */
export function useSessionKeepAlive() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    const refreshNow = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;
        // refreshSession() ottiene un nuovo access_token usando il refresh_token
        const { error } = await supabase.auth.refreshSession();
        if (cancelled) return;
        if (error) {
          console.warn("⚠️ Session refresh failed:", error.message);
          return;
        }
        // Token fresco: invalida le query principali così riprendono con il nuovo JWT
        queryClient.invalidateQueries({ queryKey: ["user-credits"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["daily-likes"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["user-likes"], refetchType: "all" });
      } catch (e) {
        console.warn("⚠️ Session keep-alive error:", e);
      }
    };

    // 1. Refresh proattivo ogni 4 minuti
    const intervalId = setInterval(refreshNow, 4 * 60 * 1000);

    // 2. Refresh quando torna il focus (utente è tornato sulla tab)
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshNow();
    };
    const onFocus = () => refreshNow();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [queryClient]);
}
