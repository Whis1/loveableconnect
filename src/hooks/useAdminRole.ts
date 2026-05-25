import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook che verifica se l'utente loggato ha il ruolo "admin".
 *
 * 🐛 FIX RACE: prima il check avveniva SOLO al mount. Login diretto da
 * /adminarrettu → useAdminRole non rilevava il SIGNED_IN → isAdmin restava
 * false. Aggiunto listener onAuthStateChange.
 *
 * 🐛 FIX FLASH: anche col listener, c'era una finestra di rendering dove
 * isLoggedIn=true ma il nuovo check non era ancora partito → "Permessi
 * insufficienti" appariva brevemente. Ora `isAdmin` è `boolean | null`:
 * null = controllo non ancora completato per la sessione corrente. Il
 * componente AdminArrettu mostra spinner finche' isAdmin === null.
 */
export const useAdminRole = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAdminRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;
        setIsAdmin(!!data);
      } catch (error) {
        console.error("Error checking admin role:", error);
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Check iniziale al mount
    checkAdminRole();

    // Ri-controlla quando la sessione cambia (login/logout/refresh).
    // Importante: setto SUBITO isAdmin=null + loading=true PRIMA del check
    // async → evita il flash di "Permessi insufficienti" tra il setIsLoggedIn(true)
    // del componente e il completamento del check ruolo.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        setIsAdmin(null);
        setLoading(true);
        checkAdminRole();
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return { isAdmin, loading };
};
