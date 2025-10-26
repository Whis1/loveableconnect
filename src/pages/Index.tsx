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

  // Pre-carica tutti i dati necessari
  useProfiles();
  useLikes();
  useCredits();
  useDailyLikes();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        navigate("/auth");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setIsAuthenticated(true);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
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

  return <Dashboard />;
};

export default Index;
