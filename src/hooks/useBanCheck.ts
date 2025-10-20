import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useBanCheck() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkBanStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check if user is banned
      const { data: banData } = await supabase
        .from("banned_users")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (banData) {
        // User is banned, force logout
        await supabase.auth.signOut();
        toast({
          title: "Account Bannato",
          description: "Il tuo account è stato sospeso. Contatta il supporto per maggiori informazioni.",
          variant: "destructive",
        });
        navigate("/auth");
      }
    };

    checkBanStatus();

    // Check periodically (every 30 seconds)
    const interval = setInterval(checkBanStatus, 30000);

    return () => clearInterval(interval);
  }, [navigate, toast]);
}
