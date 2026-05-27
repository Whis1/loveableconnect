import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * 🛡️ Hook globale: applica le penalità di abbandono partita lasciate in sospeso
 * dalla sessione precedente, ovunque l'utente navighi nel sito.
 *
 * IMPLEMENTAZIONE RACE-SAFE:
 * - Snapshot SINCRONO dei marker localStorage all'inizio + rimozione immediata,
 *   PRIMA di qualsiasi await. Così se la funzione viene chiamata 2 volte in
 *   parallelo (es. mount + onAuthStateChange SIGNED_IN), la seconda non trova
 *   più marker da applicare.
 * - Singleton `inFlight` per evitare invocazioni concorrenti.
 * - In caso di failure RPC, il marker viene RIMESSO per retry futuro.
 */

type PendingGame = {
  key: string;       // chiave localStorage
  gameName: "tris" | "dama" | "othello";
};

const PENDING_GAMES: PendingGame[] = [
  { key: "tris_pending_penalty", gameName: "tris" },
  { key: "checkers_pending_penalty", gameName: "dama" },
  // 🆕 Othello: stesso pattern. Se la RPC non riconosce "othello" come
  // p_game (vecchio backend), nel catch facciamo fallback a "dama".
  { key: "othello_pending_penalty", gameName: "othello" },
];

// Singleton a livello modulo: una sola invocazione di apply() alla volta.
let inFlight = false;

async function applyPendingPenalties() {
  if (inFlight) return;
  inFlight = true;
  try {
    // 1) Snapshot SINCRONO + rimozione marker IMMEDIATA, prima di qualsiasi
    // await: chi arriva primo "ruba" i marker, chi arriva dopo non vede nulla.
    const toApply: PendingGame[] = [];
    for (const p of PENDING_GAMES) {
      try {
        if (localStorage.getItem(p.key) === "1") {
          localStorage.removeItem(p.key);
          toApply.push(p);
        }
      } catch {
        // ignore quota / storage errors
      }
    }
    if (toApply.length === 0) return;

    // 2) Ora prendiamo la sessione. Se non c'è (utente non loggato),
    // rimettiamo i marker per applicarli al prossimo accesso.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      for (const p of toApply) {
        try { localStorage.setItem(p.key, "1"); } catch {}
      }
      return;
    }

    // 3) Applica le RPC. Su errore, rimetti il marker per retry.
    for (const p of toApply) {
      try {
        await supabase.rpc("update_game_elo", {
          user_id: session.user.id,
          elo_change: -10,
        });
        try {
          await supabase.rpc("increment_game_stat" as any, {
            p_user_id: session.user.id,
            p_game: p.gameName,
            p_result: "lose",
          });
        } catch (statErr) {
          // 🔄 Fallback: se la RPC non riconosce "othello" come p_game (DB
          // non ancora aggiornato), conta come "dama" per non perdere la
          // statistica e per non rimettere il marker (l'ELO è già scalato).
          if (p.gameName === "othello") {
            await supabase.rpc("increment_game_stat" as any, {
              p_user_id: session.user.id,
              p_game: "dama",
              p_result: "lose",
            });
          } else {
            throw statErr;
          }
        }
        console.log(`🛡️ Pending penalty applicata per ${p.gameName} (abbandono partita)`);
      } catch (e) {
        console.warn(`⚠️ Impossibile applicare pending penalty ${p.gameName}:`, e);
        try { localStorage.setItem(p.key, "1"); } catch {}
      }
    }
  } finally {
    inFlight = false;
  }
}

export function useApplyGamePendingPenalty() {
  useEffect(() => {
    // Eseguito una volta al mount (avvio app)
    applyPendingPenalties();

    // E ad ogni evento auth rilevante
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        applyPendingPenalties();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);
}
