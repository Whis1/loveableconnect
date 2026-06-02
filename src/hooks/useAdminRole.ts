import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook che verifica se l'utente loggato ha il ruolo "admin" e il suo TIER.
 *
 * Tier 1 = full access (vede tutti i pulsanti incluso Profili&Chat + Creazione)
 * Tier 2 = ridotto (no Profili&Chat, no Creazione Profili)
 *
 * 🐛 FIX FLASH/"RELOAD": NON azzeriamo piu' isAdmin ad ogni evento auth.
 * Supabase scatena TOKEN_REFRESHED (refresh token, focus della scheda, ecc.)
 * anche quando l'utente NON cambia: prima ogni evento rimetteva isAdmin=null e
 * la pagina admin rimontava tutto sulla schermata di caricamento, sembrando un
 * "ricaricamento" continuo. Ora ricontrolliamo SOLO quando cambia davvero
 * l'utente (login/logout), e in modo silenzioso (senza tornare a null).
 */
export const useAdminRole = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminTier, setAdminTier] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Ultimo utente per cui abbiamo verificato il ruolo: evita ricontrolli
    // (e quindi flash) inutili sugli eventi auth con lo stesso utente.
    const lastUserIdRef = { current: null as string | null };

    const checkAdminRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        const uid = session?.user?.id ?? null;
        lastUserIdRef.current = uid;

        if (!uid) {
          setIsAdmin(false);
          setAdminTier(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role, admin_tier")
          .eq("user_id", uid)
          .eq("role", "admin")
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;

        if (data) {
          setIsAdmin(true);
          setAdminTier(((data as any).admin_tier as number) ?? 1);
        } else {
          setIsAdmin(false);
          setAdminTier(null);
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
        if (!cancelled) {
          setIsAdmin(false);
          setAdminTier(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAdminRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const uid = session?.user?.id ?? null;

      if (event === "SIGNED_OUT" || !uid) {
        lastUserIdRef.current = null;
        setIsAdmin(false);
        setAdminTier(null);
        setLoading(false);
        return;
      }

      // Ricontrolla SOLO se e' cambiato l'utente (vero login con account diverso).
      // TOKEN_REFRESHED / USER_UPDATED / re-focus con lo stesso utente: ignora,
      // il ruolo non e' cambiato → niente flash della schermata di caricamento.
      if (uid !== lastUserIdRef.current) {
        checkAdminRole();
      }
    });

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  return { isAdmin, adminTier, loading };
};
