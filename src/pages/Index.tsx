import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import Dashboard from "./Dashboard";
import { useProfiles } from "@/hooks/useProfiles";
import { useLikes } from "@/hooks/useLikes";
import { useCredits } from "@/hooks/useCredits";
import { useDailyLikes } from "@/hooks/useDailyLikes";
import { getStoredUserId } from "@/lib/storedSession";
import { PageLoader } from "@/components/PageLoader";

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Controlla subito (in modo sincrono) se c'è una sessione salvata: così la
  // home appare all'istante, senza aspettare getSession() che può bloccarsi.
  const [hasStoredSession] = useState(() => getStoredUserId() !== null);
  const [loading, setLoading] = useState(!hasStoredSession);
  const [isAuthenticated, setIsAuthenticated] = useState(hasStoredSession);

  useEffect(() => {
    let lastUpdateTime = 0;
    const UPDATE_THROTTLE = 30000; // Update max once every 30 seconds

    // Detect if we're on an OAuth callback URL (avoid redirecting away before tokens are processed)
    const isAuthCallback = (() => {
      if (typeof window === 'undefined') return false;
      const hash = window.location.hash || '';
      const params = new URLSearchParams(window.location.search);
      return (
        hash.includes('access_token') ||
        params.has('code') ||
        params.has('access_token') ||
        params.has('provider_token')
      );
    })();

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        // Defer side-effects to avoid blocking the callback
        setTimeout(() => {
          updateLastActive();
        }, 0);
        setLoading(false);
      } else {
        // If we're on the OAuth callback, don't navigate away yet
        if (isAuthCallback) {
          setLoading(true);
        } else {
          setIsAuthenticated(false);
          navigate('/auth');
          setLoading(false);
        }
      }
    });

    // 2) Then check for an existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
        setTimeout(() => {
          updateLastActive();
        }, 0);
        setLoading(false);
      } else {
        // If this is an OAuth return URL, wait for Supabase to finish processing tokens
        if (isAuthCallback) {
          setLoading(true);
        } else {
          setIsAuthenticated(false);
          navigate('/auth');
          setLoading(false);
        }
      }
    }).catch(() => setLoading(false));

    // Safety net: never keep the spinner forever
    const loadingTimeout = setTimeout(() => setLoading(false), 8000);

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
    return <PageLoader />;
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
