import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Crown, Heart, Plus } from "lucide-react";

export const UserCreditsManager = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [creditsAmount, setCreditsAmount] = useState("");
  const [likesAmount, setLikesAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPremium, setLoadingPremium] = useState(false);
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);

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
      const { data, error } = await supabase.functions.invoke('admin-add-credits', {
        body: { 
          userId, 
          creditsAmount: parseInt(creditsAmount) 
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Errore sconosciuto');
      }

      toast({
        title: "Crediti aggiunti",
        description: `${creditsAmount} crediti aggiunti all'utente (nuovo saldo: ${data.newBalance})`,
      });

      setUserId("");
      setCreditsAmount("");
    } catch (error: any) {
      console.error("Error adding credits:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiungere crediti",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPremium = async () => {
    if (!userId) {
      toast({
        title: "Errore",
        description: "Inserisci user ID",
        variant: "destructive",
      });
      return;
    }

    setLoadingPremium(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await supabase
        .from("user_credits")
        .update({ 
          is_premium: true,
          premium_expires_at: expiresAt.toISOString()
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Premium Assegnato",
        description: "Abbonamento premium di 30 giorni assegnato",
      });

      setUserId("");
    } catch (error: any) {
      console.error("Error assigning premium:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPremium(false);
    }
  };

  const handleUnlockLikes = async () => {
    if (!userId) {
      toast({
        title: "Errore",
        description: "Inserisci user ID",
        variant: "destructive",
      });
      return;
    }

    setLoadingUnlock(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Check if user already has an unlock
      const { data: existing } = await supabase
        .from("likes_unlocked")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("likes_unlocked")
          .update({ 
            expires_at: expiresAt.toISOString(),
            unlocked_at: new Date().toISOString()
          })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("likes_unlocked")
          .insert({ 
            user_id: userId,
            expires_at: expiresAt.toISOString()
          });

        if (error) throw error;
      }

      toast({
        title: "Likes Sbloccati",
        description: "Accesso likes sbloccato per 24 ore",
      });

      setUserId("");
    } catch (error: any) {
      console.error("Error unlocking likes:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingUnlock(false);
    }
  };

  const handleAddLikes = async () => {
    if (!userId || !likesAmount) {
      toast({
        title: "Errore",
        description: "Inserisci user ID e quantità like",
        variant: "destructive",
      });
      return;
    }

    setLoadingLikes(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-add-likes', {
        body: { 
          userId, 
          likesAmount: parseInt(likesAmount) 
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Errore sconosciuto');
      }

      toast({
        title: "Like Aggiunti",
        description: `${likesAmount} like aggiunti (nuovo totale: ${data.newLikesRemaining})`,
      });

      setUserId("");
      setLikesAmount("");
    } catch (error: any) {
      console.error("Error adding likes:", error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiungere like",
        variant: "destructive",
      });
    } finally {
      setLoadingLikes(false);
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
        <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-2">
            <Label htmlFor="likes">Like da Aggiungere</Label>
            <Input
              id="likes"
              type="number"
              value={likesAmount}
              onChange={(e) => setLikesAmount(e.target.value)}
              placeholder="Es: 10"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleAddCredits} disabled={loading}>
            <Coins className="h-4 w-4 mr-2" />
            {loading ? "Aggiungendo..." : "Aggiungi Crediti"}
          </Button>
          
          <Button 
            onClick={handleAddLikes} 
            disabled={loadingLikes}
            variant="secondary"
          >
            <Plus className="h-4 w-4 mr-2" />
            {loadingLikes ? "Aggiungendo..." : "Aggiungi Like"}
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={handleAssignPremium} 
            disabled={loadingPremium} 
            variant="outline"
          >
            <Crown className="h-4 w-4 mr-2" />
            {loadingPremium ? "Assegnando..." : "Premium (30gg)"}
          </Button>
          
          <Button 
            onClick={handleUnlockLikes} 
            disabled={loadingUnlock} 
            variant="outline"
          >
            <Heart className="h-4 w-4 mr-2" />
            {loadingUnlock ? "Sbloccando..." : "Sblocca (24h)"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
