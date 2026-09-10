import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredUserId } from "@/lib/storedSession";

// The auth event supplies the session; never start another auth request inside it.
export function useCurrentUserId() {
  const [userId, setUserId] = useState(getStoredUserId);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return userId;
}
