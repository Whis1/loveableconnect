import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type PresenceMode = "active" | "login" | "logout";

const missingPresenceColumn = (error: unknown): boolean => {
  const text = JSON.stringify(error ?? {}).toLowerCase();
  return (
    text.includes("last_login_at") ||
    text.includes("last_logout_at") ||
    text.includes("column")
  );
};

const updatePresence = async (userId: string, mode: PresenceMode) => {
  const now = new Date().toISOString();
  const payload: Record<string, string> = { last_active: now };

  if (mode === "login") payload.last_login_at = now;
  if (mode === "logout") payload.last_logout_at = now;

  const { error } = await (supabase as any)
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  if (error && missingPresenceColumn(error)) {
    await supabase
      .from("profiles")
      .update({ last_active: now })
      .eq("id", userId);
  } else if (error) {
    throw error;
  }
};

export const markCurrentUserOffline = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.id) {
      await updatePresence(session.user.id, "logout");
    }
  } catch (error) {
    console.warn("Unable to mark user offline:", error);
  }
};

export const usePresenceTracking = () => {
  const currentUserIdRef = useRef<string | null>(null);
  const lastActiveAtRef = useRef(0);
  const loginMarkedForRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const ACTIVE_THROTTLE = 30000;

    const markActive = async (userId: string, mode: PresenceMode = "active") => {
      if (!mounted) return;
      const now = Date.now();
      if (mode === "active" && now - lastActiveAtRef.current < ACTIVE_THROTTLE) {
        return;
      }

      lastActiveAtRef.current = now;
      try {
        await updatePresence(userId, mode);
      } catch (error) {
        console.warn("Presence update failed:", error);
      }
    };

    const markLogin = (userId: string) => {
      currentUserIdRef.current = userId;
      if (loginMarkedForRef.current !== userId) {
        loginMarkedForRef.current = userId;
        void markActive(userId, "login");
      } else {
        void markActive(userId);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) markLogin(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user?.id) {
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          markLogin(session.user.id);
        } else if (event !== "TOKEN_REFRESHED") {
          currentUserIdRef.current = session.user.id;
          void markActive(session.user.id);
        }
      }

      if (event === "SIGNED_OUT") {
        currentUserIdRef.current = null;
        loginMarkedForRef.current = null;
      }
    });

    const activityInterval = window.setInterval(() => {
      if (currentUserIdRef.current) void markActive(currentUserIdRef.current);
    }, 60000);

    const handleActivity = () => {
      if (currentUserIdRef.current) void markActive(currentUserIdRef.current);
    };

    const handlePageHide = () => {
      if (currentUserIdRef.current) {
        void updatePresence(currentUserIdRef.current, "logout").catch((error) => {
          console.warn("Presence logout update failed:", error);
        });
      }
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.clearInterval(activityInterval);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);
};
