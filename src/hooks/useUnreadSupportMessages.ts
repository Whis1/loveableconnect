import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * 🔔 Hook che monitora i messaggi non letti del supporto clienti.
 * - Conta i messaggi degli utenti (is_admin_response=false) con read=false
 * - Si iscrive ai cambiamenti realtime su support_messages
 * - Suona un beep sintetico (Web Audio API) quando arriva un nuovo messaggio
 * - Espone unreadCount per il badge / animazione lampeggio del pulsante
 *
 * Usato in AdminArrettu per il pulsante "Supporto Clienti".
 */

// Beep "ding" sintetico via Web Audio API (no file audio richiesti).
function playNotificationBeep() {
  try {
    const AudioContextCtor =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const now = ctx.currentTime;

    // Doppio "ding-dong" - due toni: 880 Hz e 660 Hz
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(880, now, 0.18); // primo ding (alto)
    playTone(660, now + 0.18, 0.32); // secondo ding (basso)

    // Pulisce il context dopo 1 secondo
    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 1000);
  } catch (e) {
    console.warn("Audio notification non disponibile:", e);
  }
}

export function useUnreadSupportMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const isFirstFetchRef = useRef(true);

  const fetchUnread = async () => {
    try {
      const { count, error } = await supabase
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .eq("is_admin_response", false)
        .eq("read", false);
      if (error) {
        console.warn("Errore fetch unread support messages:", error);
        return;
      }
      setUnreadCount(count ?? 0);
    } catch (e) {
      console.warn("fetchUnread exception:", e);
    }
  };

  useEffect(() => {
    fetchUnread();

    const channel = supabase
      .channel("support_messages_unread_watch")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => {
          const newMsg = payload.new as any;
          // Beep solo su messaggi degli UTENTI (non risposte admin),
          // e solo se NON è il primo fetch (evita beep al caricamento pagina).
          if (!newMsg?.is_admin_response && !isFirstFetchRef.current) {
            playNotificationBeep();
          }
          isFirstFetchRef.current = false;
          fetchUnread();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_messages" },
        () => fetchUnread()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "support_messages" },
        () => fetchUnread()
      )
      .subscribe(() => {
        // Dopo la sottoscrizione, marchiamo la fase iniziale come completata
        // così il prossimo INSERT scatena il beep.
        setTimeout(() => {
          isFirstFetchRef.current = false;
        }, 500);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { unreadCount };
}
