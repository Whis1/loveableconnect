import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Recupera l'id del tema estetico (profiles.profile_theme) di un profilo.
 * Usato dove abbiamo solo l'id del profilo (es. avversario in partita) e
 * vogliamo mostrare l'anello del tema sull'avatar.
 */
export function useProfileTheme(profileId: string | null | undefined): string | null {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => {
    if (!profileId) {
      setTheme(null);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await (supabase.from("profiles") as any)
        .select("profile_theme")
        .eq("id", profileId)
        .maybeSingle();
      if (active) setTheme(data?.profile_theme ?? null);
    })();
    return () => {
      active = false;
    };
  }, [profileId]);
  return theme;
}
