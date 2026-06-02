import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredUserId } from "@/lib/storedSession";

// Timestamp dell'ultima volta che l'utente ha aperto la pagina "I Tuoi Match".
const LAST_SEEN_KEY = "matches_last_seen_at";

// 🔔 Suono di notifica orecchiabile (tre note ascendenti) via Web Audio API,
//    senza bisogno di file audio. Si sente su qualsiasi pagina.
//    Rispetta la preferenza locale impostata in Modifica profilo (default: ON).
function playMessageChime() {
  try {
    if (localStorage.getItem("notif_sound_enabled") === "0") return;
  } catch { /* noop: se localStorage non disponibile, suona comunque */ }
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;
    const note = (freq: number, start: number, dur: number, peak = 0.22) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t0 + start);
      gain.gain.setValueAtTime(0, t0 + start);
      gain.gain.linearRampToValueAtTime(peak, t0 + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + start + dur);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur);
    };
    // D5 - F#5 - B5
    note(587.33, 0, 0.16);
    note(739.99, 0.12, 0.16);
    note(987.77, 0.24, 0.34);
    setTimeout(() => {
      try { ctx.close(); } catch { /* noop */ }
    }, 1300);
  } catch {
    /* audio non disponibile */
  }
}

interface MatchNotificationValue {
  hasNew: boolean;
  markSeen: () => void;
}

const MatchNotificationContext = createContext<MatchNotificationValue>({
  hasNew: false,
  markSeen: () => {},
});

export const useMatchNotification = () => useContext(MatchNotificationContext);

export const MatchNotificationProvider = ({ children }: { children: ReactNode }) => {
  const [hasNew, setHasNew] = useState(false);
  const markSeenRef = useRef<() => void>(() => {});

  const markSeen = () => {
    try { localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString()); } catch { /* noop */ }
    setHasNew(false);
  };
  markSeenRef.current = markSeen;

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const setup = async () => {
      const userId = getStoredUserId();
      if (!userId) return;

      // Stato iniziale (anche dopo un refresh): c'e' un messaggio piu' recente
      // dell'ultima visita ai match? In tal caso la home deve gia' lampeggiare.
      const lastSeen = (() => {
        try { return localStorage.getItem(LAST_SEEN_KEY); } catch { return null; }
      })();
      if (window.location.pathname !== "/matches") {
        try {
          let q = supabase
            .from("messages")
            .select("id")
            .eq("receiver_id", userId)
            .order("created_at", { ascending: false })
            .limit(1);
          if (lastSeen) q = q.gt("created_at", lastSeen);
          const { data } = await q;
          if (!cancelled && data && data.length > 0) setHasNew(true);
        } catch { /* noop */ }
      }

      channel = supabase
        .channel(`global-msg-notify-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
          () => {
            playMessageChime();
            // Se sei gia' nella pagina match e' come averli visti; altrimenti lampeggia.
            if (window.location.pathname !== "/matches") setHasNew(true);
            else markSeenRef.current();
          }
        )
        .subscribe();
    };

    setup();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setHasNew(false);
        if (channel) { supabase.removeChannel(channel); channel = null; }
      }
      if (event === "SIGNED_IN") {
        if (channel) { supabase.removeChannel(channel); channel = null; }
        setup();
      }
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MatchNotificationContext.Provider value={{ hasNew, markSeen }}>
      {children}
    </MatchNotificationContext.Provider>
  );
};
