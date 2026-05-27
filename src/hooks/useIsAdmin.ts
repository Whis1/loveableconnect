import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * 🔧 Hook che ritorna `true` se l'utente loggato e' un admin
 * (riga in user_roles con role='admin'). Usato per mostrare strumenti
 * di debug/test SOLO agli admin (es. pulsante "Vinci partita" nelle board).
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          if (!cancelled) setIsAdmin(false);
          return;
        }
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!cancelled) setIsAdmin(!!data);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };

    check();

    // Aggiorna su cambio di auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}
