import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * 🛡️ Hook globale: applica le penalità di abbandono partita lasciate in sospeso
 * dalla sessione precedente, ovunque l'utente navighi nel sito.
 *
 * Prima il controllo `tris_pending_penalty` / `checkers_pending_penalty` veniva
 * fatto SOLO al mount di TrisBoard/CheckersBoard. Se un utente abbandonava una
 * partita (F5, chiusura tab, ecc.) e non rientrava più in una nuova partita
 * dello stesso gioco, le sconfitte restavano in attesa per sempre — exploit
 * facile per evitare la penalità.
 *
 * Ora il check scatta all'avvio dell'app (montato in App.tsx). Appena il primo
 * componente che usa supabase auth ottiene una sessione valida, si applica
 * `update_game_elo(-10)` + `increment_game_stat('lose')` per ogni gioco in
 * sospeso, e si pulisce il marker.
 */

type PendingGame = {
  key: string;       // chiave localStorage
  gameName: "tris" | "dama";
};

const PENDING_GAMES: PendingGame[] = [
  { key: "tris_pending_penalty", gameName: "tris" },
  { key: "checkers_pending_penalty", gameName: "dama" },
];

export function useApplyGamePendingPenalty() {
  useEffect(() => {
    let cancelled = false;

    const apply = async () => {
      // Controlla quali pending ci sono PRIMA di fare richieste
      const pending = PENDING_GAMES.filter((p) => {
        try {
          return localStorage.getItem(p.key) === "1";
        } catch {
          return false;
        }
      });
      if (pending.length === 0) return;

      // Serve una sessione attiva per RPC autenticate
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session) return;

      for (const p of pending) {
        // 🛡️ Rimuovi il marker SUBITO (sincrono) PRIMA di applicare le RPC
        // → previene race con mount di TrisBoard/CheckersBoard che potrebbero
        // vedere lo stesso marker e applicare un'altra penalità doppione.
        try {
          localStorage.removeItem(p.key);
        } catch {}

        try {
          await supabase.rpc("update_game_elo", {
            user_id: session.user.id,
            elo_change: -10,
          });
          await supabase.rpc("increment_game_stat" as any, {
            p_user_id: session.user.id,
            p_game: p.gameName,
            p_result: "lose",
          });
          console.log(`🛡️ Pending penalty applicata per ${p.gameName} (abbandono partita)`);
        } catch (e) {
          console.warn(`⚠️ Impossibile applicare pending penalty ${p.gameName}:`, e);
          // Rimetti il marker per retry al prossimo avvio (la rimozione sopra
          // era ottimistica per evitare race; se le RPC falliscono, rimetti).
          try {
            localStorage.setItem(p.key, "1");
          } catch {}
        }
      }
    };

    // Eseguito una volta al mount (avvio app) + ogni volta che cambia auth state
    apply();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        apply();
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);
}
