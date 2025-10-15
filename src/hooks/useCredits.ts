import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserCredits {
  balance: number;
  is_premium: boolean;
  last_daily_reset: string;
}

export const useCredits = () => {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCredits = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_credits")
        .select("balance, is_premium, last_daily_reset")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create initial credits record
        const { error: insertError } = await supabase
          .from("user_credits")
          .insert({
            user_id: session.user.id,
            balance: 40,
          });

        if (insertError) throw insertError;

        setCredits({
          balance: 40,
          is_premium: false,
          last_daily_reset: new Date().toISOString(),
        });
      } else {
        setCredits(data as UserCredits);
      }
    } catch (error: any) {
      console.error("Error fetching credits:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i crediti",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("user_credits_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_credits",
        },
        () => {
          fetchCredits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const deductCredits = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const { data, error } = await supabase.rpc("deduct_message_credits", {
        _user_id: session.user.id,
      });

      if (error) throw error;

      if (!data) {
        toast({
          title: "Crediti insufficienti",
          description: "Hai esaurito i crediti di oggi. Acquista crediti per continuare.",
          variant: "destructive",
        });
        return false;
      }

      await fetchCredits();
      return true;
    } catch (error: any) {
      console.error("Error deducting credits:", error);
      toast({
        title: "Errore",
        description: "Impossibile detrarre i crediti",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    credits,
    loading,
    refetch: fetchCredits,
    deductCredits,
  };
};