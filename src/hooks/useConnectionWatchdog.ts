import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * 🛡️ Connection Watchdog globale.
 *
 * Risolve definitivamente il problema "Caricamento infinito" causato da:
 *   - JWT scaduto silenziosamente (Supabase v2 quirk)
 *   - WebSocket realtime piantato (channel zombie che bloccano le REST query)
 *   - Connection pool esaurito (troppi channel aperti durante navigazione)
 *
 * COME FUNZIONA:
 * 1. Espone una funzione globale `reportTimeout()` che i vari hook chiamano
 *    quando una loro query Supabase va in TIMEOUT.
 * 2. Tiene un counter degli ultimi timeout in una sliding window di 15s.
 * 3. Quando il counter raggiunge 3 timeout in 15s → fa AUTO-RECOVERY:
 *      a) Rimuove TUTTI i channel realtime attivi (pulisce zombie)
 *      b) Refresha la sessione (nuovo JWT fresh)
 *      c) Invalida le query React-Query principali (le ri-fetch parte automaticamente)
 *      d) Reset del counter
 * 4. Inoltre, fa un refresh proattivo OGNI 90 secondi + on focus + on visibility.
 *
 * Niente più "torno alla home e tutto è skeleton per minuti".
 */

interface TimeoutRecord {
  timestamp: number;
  source: string;
}

const TIMEOUT_RECORDS: TimeoutRecord[] = [];
const TIMEOUT_WINDOW_MS = 15_000;
const TIMEOUT_THRESHOLD = 3;
let lastRecoveryAt = 0;
const RECOVERY_COOLDOWN_MS = 10_000;

/**
 * 🚨 Chiamata dagli hook quando una query Supabase va in TIMEOUT.
 * Esempio: `reportSupabaseTimeout("fetchCredits")`.
 */
export function reportSupabaseTimeout(source: string) {
  const now = Date.now();
  // Filtra solo i timeout recenti
  TIMEOUT_RECORDS.push({ timestamp: now, source });
  while (TIMEOUT_RECORDS.length > 0 && now - TIMEOUT_RECORDS[0].timestamp > TIMEOUT_WINDOW_MS) {
    TIMEOUT_RECORDS.shift();
  }

  // Soglia raggiunta → trigger recovery (con cooldown per non auto-attivarsi in loop)
  if (TIMEOUT_RECORDS.length >= TIMEOUT_THRESHOLD && now - lastRecoveryAt > RECOVERY_COOLDOWN_MS) {
    lastRecoveryAt = now;
    void triggerAutoRecovery();
  }
}

async function triggerAutoRecovery() {
  console.warn("🛡️ Connection Watchdog: AUTO-RECOVERY in corso (3+ timeout in 15s)");
  try {
    // 1) Chiudi TUTTI i channel realtime: spesso sono la causa (websocket piantato)
    try {
      const channels = supabase.getChannels?.() ?? [];
      for (const ch of channels) {
        try {
          await supabase.removeChannel(ch);
        } catch {
          // ignore single channel errors
        }
      }
      console.log(`🛡️ Watchdog: rimossi ${channels.length} channel realtime`);
    } catch (e) {
      console.warn("Watchdog: removeChannels fallito:", e);
    }

    // 2) Refresha JWT (risolve token scaduto)
    try {
      await supabase.auth.refreshSession();
      console.log("🛡️ Watchdog: JWT refreshato");
    } catch (e) {
      console.warn("Watchdog: refreshSession fallito:", e);
    }

    // 3) Reset counter
    TIMEOUT_RECORDS.length = 0;
  } catch (e) {
    console.error("🛡️ Watchdog auto-recovery error:", e);
  }
}

export function useConnectionWatchdog() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    const refreshProactive = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;
        const { error } = await supabase.auth.refreshSession();
        if (cancelled || error) return;
        // Invalida le query principali per ri-fetch con nuovo token
        queryClient.invalidateQueries({ queryKey: ["user-credits"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["daily-likes"], refetchType: "all" });
      } catch {
        // silenzioso, non rompere l'app per un refresh fallito
      }
    };

    // 1) Refresh proattivo ogni 90 secondi (era 4 min, troppo lento)
    const intervalId = setInterval(refreshProactive, 90_000);

    // 2) Refresh on visibility / focus
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshProactive();
    };
    const onFocus = () => refreshProactive();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    // 3) Hook al recovery: quando il watchdog finisce, invalida le query
    //    per forzare il re-fetch (la lista è la stessa di refreshProactive)
    const recoveryHook = () => {
      queryClient.invalidateQueries({ queryKey: ["user-credits"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["daily-likes"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["user-likes"], refetchType: "all" });
    };

    // Polling leggero del counter (ogni 2s) per detection recovery
    let lastSeenRecoveryAt = lastRecoveryAt;
    const recoveryPoller = setInterval(() => {
      if (lastRecoveryAt !== lastSeenRecoveryAt) {
        lastSeenRecoveryAt = lastRecoveryAt;
        // Aspetta 1s che il refresh JWT abbia finito, poi invalida
        setTimeout(recoveryHook, 1000);
      }
    }, 2000);

    // 🚦 CHANNEL CAP PREVENTIVO: ogni 5s controlla quanti channel realtime
    //    sono aperti. Se > 12 (significa accumulo zombie da navigazione),
    //    chiude i più vecchi mantenendo solo gli ultimi 8.
    //    Evita che il connection pool del browser si saturi PRIMA che il
    //    watchdog reattivo entri in azione.
    const channelCapPoller = setInterval(() => {
      try {
        const channels = supabase.getChannels?.() ?? [];
        if (channels.length > 12) {
          // Chiudi i primi (più vecchi), tieni gli ultimi 8
          const toClose = channels.slice(0, channels.length - 8);
          console.warn(
            `🚦 Channel cap: ${channels.length} channel attivi, chiudo ${toClose.length} più vecchi`
          );
          for (const ch of toClose) {
            try {
              supabase.removeChannel(ch);
            } catch {}
          }
        }
      } catch {
        // ignore
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      clearInterval(recoveryPoller);
      clearInterval(channelCapPoller);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [queryClient]);
}
