import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * 🔔 Hook che monitora i messaggi non letti del supporto clienti.
 * - Conta i messaggi degli utenti (is_admin_response=false) con read=false
 * - Si iscrive ai cambiamenti realtime su support_messages
 * - Suona un beep sintetico (Web Audio API) quando arriva un nuovo messaggio
 * - Espone unreadCount per il badge / animazione lampeggio del pulsante
 *
 * 🔁 Re-fetch dopo login: il hook osserva lo stato di auth con
 * `onAuthStateChange` e ri-esegue il fetch + ri-sottoscrive il channel
 * quando l'utente passa da non-autenticato a autenticato. Questo evita
 * il bug per cui se l'admin apriva /adminarrettu da disconnesso e poi
 * faceva login, le notifiche storiche non apparivano (perché il primo
 * fetch al mount falliva via RLS).
 *
 * La fonte di verità è il DB (campo `read=false`), quindi le notifiche
 * sono già persistenti: una volta che l'admin si logga, le rivede tutte
 * finché non clicca sulla chat (che chiama RPC mark_support_messages_read).
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
  // Traccia se siamo autenticati per evitare fetch inutili che ritornano 0.
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

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

  // 🔐 Sincronizza lo stato di auth: se l'utente fa login DOPO che il hook
  // è stato montato, dobbiamo ri-fetchare (prima il fetch falliva via RLS).
  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) setIsAuthed(!!session?.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) setIsAuthed(!!session?.user);
      }
    );
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Se non autenticato, azzera il count e non sottoscrivere realtime.
    if (!isAuthed) {
      setUnreadCount(0);
      return;
    }

    // Reset del flag isFirst: alla prima fetch post-login NON suoniamo
    // beep per i messaggi storici accumulati.
    isFirstFetchRef.current = true;
    fetchUnread();

    // 🐛 FIX leak: il nome canale era `support_messages_unread_watch_${Date.now()}`,
    //    quindi ogni mount creava un canale UNICO che non veniva mai
    //    deduplicato. Adesso il nome è STABILE: Supabase deduplicherà.
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

    // 👁️ Re-fetch quando la tab torna visibile (admin che ritorna al PC).
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUnread();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // 🪟 Re-fetch quando la window riceve focus (cambio tab → torno indietro).
    const onFocus = () => fetchUnread();
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthed]);

  return { unreadCount };
}
