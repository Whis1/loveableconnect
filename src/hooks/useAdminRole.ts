import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook che verifica se l'utente loggato ha il ruolo "admin" e il suo TIER.
 *
 * Tier 1 = full access (vede tutti i pulsanti incluso Profili&Chat + Creazione)
 * Tier 2 = ridotto (no Profili&Chat, no Creazione Profili)
 *
 * 🐛 FIX RACE: ricontrolla ad ogni onAuthStateChange (SIGNED_IN/OUT/REFRESH).
 * 🐛 FIX FLASH: isAdmin è boolean|null (null = check in corso).
 */
export const useAdminRole = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminTier, setAdminTier] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAdminRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!session?.user) {
          setIsAdmin(false);
          setAdminTier(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role, admin_tier")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;

        if (data) {
          setIsAdmin(true);
          // admin_tier puo' essere null per record creati prima della migration
          // → di default tier 1 (full access, retrocompatibile).
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        setIsAdmin(null);
        setAdminTier(null);
        setLoading(true);
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
