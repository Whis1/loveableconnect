import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook che verifica se l'utente loggato ha il ruolo "admin".
 *
 * 🐛 FIX: prima il check avveniva SOLO al mount. Se l'utente arrivava sulla
 * pagina /adminarrettu senza essere loggato e poi faceva login dal form
 * direttamente (senza passare prima da /auth), `useAdminRole` non vedeva
 * mai il login → restava isAdmin=false → mostrava "Permessi insufficienti".
 *
 * Ora ascolta anche onAuthStateChange (SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED)
 * e ri-controlla il ruolo ogni volta che la sessione cambia.
 */
export const useAdminRole = () => {
  const [isAdmin, setIsAdmin] = useState(false);
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

    // Ri-controlla quando la sessione cambia (login/logout/refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
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
