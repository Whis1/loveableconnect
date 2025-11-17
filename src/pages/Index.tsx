import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import Dashboard from "./Dashboard";
import { useProfiles } from "@/hooks/useProfiles";
import { useLikes } from "@/hooks/useLikes";
import { useCredits } from "@/hooks/useCredits";
import { useDailyLikes } from "@/hooks/useDailyLikes";

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE = 30000; // Update max once every 30 seconds

    const updateLastActive = async () => {
      const now = Date.now();
      if (now - lastUpdateTime < UPDATE_THROTTLE) {
        return; // Skip update if less than 30 seconds since last update
      }
      lastUpdateTime = now;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase
          .from('profiles')
          .update({ last_active: new Date().toISOString() })
          .eq('id', session.user.id);
      }
    };

    // 1) Listen to auth state changes FIRST to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
        // Defer side-effects to avoid blocking the callback
        setTimeout(() => {
          updateLastActive();
        }, 0);
      } else {
        setIsAuthenticated(false);
        navigate('/auth');
      }
      // Ensure we clear loading state on any auth event
      setLoading(false);
    });

    // 2) Then check for an existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        setTimeout(() => {
          updateLastActive();
        }, 0);
      } else {
        setIsAuthenticated(false);
        navigate('/auth');
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    // Safety net: never keep the spinner forever
    const loadingTimeout = setTimeout(() => setLoading(false), 4000);

    // Update last_active every minute
    const activityInterval = setInterval(() => setTimeout(updateLastActive, 0), 60000);

    // Update on user activity (throttled)
    const handleActivity = () => setTimeout(updateLastActive, 0);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      subscription.unsubscribe();
      clearInterval(activityInterval);
      clearTimeout(loadingTimeout);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AuthenticatedApp />;
};

// Componente che carica i dati solo dopo l'autenticazione
const AuthenticatedApp = () => {
  // Pre-carica tutti i dati necessari solo dopo l'autenticazione
  useProfiles();
  useLikes();
  useCredits();
  useDailyLikes();

  return <Dashboard />;
};

export default Index;
