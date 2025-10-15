import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Coins } from "lucide-react";

export const UserCreditsManager = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [creditsAmount, setCreditsAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddCredits = async () => {
    if (!userId || !creditsAmount) {
      toast({
        title: "Errore",
        description: "Inserisci user ID e quantità crediti",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Get current balance
      const { data: currentData, error: fetchError } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", userId)
        .single();

      if (fetchError) throw fetchError;

      // Update with new balance
      const { error } = await supabase
        .from("user_credits")
        .update({ balance: currentData.balance + parseInt(creditsAmount) })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Crediti aggiunti",
        description: `${creditsAmount} crediti aggiunti all'utente`,
      });

      setUserId("");
      setCreditsAmount("");
    } catch (error: any) {
      console.error("Error adding credits:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Gestione Crediti Utente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userId">User ID</Label>
          <Input
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="UUID dell'utente"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="credits">Crediti da Aggiungere</Label>
          <Input
            id="credits"
            type="number"
            value={creditsAmount}
            onChange={(e) => setCreditsAmount(e.target.value)}
            placeholder="Es: 100"
          />
        </div>
        <Button onClick={handleAddCredits} disabled={loading} className="w-full">
          {loading ? "Aggiungendo..." : "Aggiungi Crediti"}
        </Button>
      </CardContent>
    </Card>
  );
};
