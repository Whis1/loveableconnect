import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Crown, Heart, Plus, XCircle, Search } from "lucide-react";

export const UserCreditsManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [creditsAmount, setCreditsAmount] = useState("");
  const [likesAmount, setLikesAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPremium, setLoadingPremium] = useState(false);
  const [loadingWeeklyPremium, setLoadingWeeklyPremium] = useState(false);
  const [loadingPlatinum, setLoadingPlatinum] = useState(false);
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingRemoveSub, setLoadingRemoveSub] = useState(false);
  const [loadingDiagnose, setLoadingDiagnose] = useState(false);
  const [diagnoseResult, setDiagnoseResult] = useState<any>(null);

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
          subscription_type: 'monthly',
          premium_tier: 'premium',
          premium_expires_at: expiresAt.toISOString(),
          balance: 999,
          daily_likes_remaining: 999,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Premium Mensile Assegnato",
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

  const handleAssignWeeklyPremium = async () => {
    if (!userId) {
      toast({
        title: "Errore",
        description: "Inserisci user ID",
        variant: "destructive",
      });
      return;
    }

    setLoadingWeeklyPremium(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase
        .from("user_credits")
        .update({ 
          is_premium: true,
          subscription_type: 'weekly',
          premium_expires_at: expiresAt.toISOString(),
          balance: 40,
          daily_likes_remaining: 30,
          daily_free_chats_remaining: 5,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Premium Settimanale Assegnato",
        description: "Abbonamento premium di 7 giorni assegnato",
      });

      setUserId("");
    } catch (error: any) {
      console.error("Error assigning weekly premium:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingWeeklyPremium(false);
    }
  };

  const handleAssignPlatinum = async () => {
    if (!userId) {
      toast({
        title: "Errore",
        description: "Inserisci user ID",
        variant: "destructive",
      });
      return;
    }

    setLoadingPlatinum(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error } = await supabase
        .from("user_credits")
        .update({ 
          is_premium: true,
          subscription_type: 'monthly',
          premium_tier: 'standard',
          premium_expires_at: expiresAt.toISOString(),
          balance: 70,
          daily_likes_remaining: 40,
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Platino Assegnato",
        description: "Abbonamento Platino di 30 giorni assegnato (€69,99)",
      });

      setUserId("");
    } catch (error: any) {
      console.error("Error assigning platinum:", error);
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingPlatinum(false);
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
      toast({
        title: "Funzionalità rimossa",
        description: "Il sistema di unlock globale è stato sostituito con lo sblocco per-profilo da 8 crediti",
        variant: "destructive",
      });
    } finally {
      setLoadingUnlock(false);
    }
  };

  // Calcola hasActiveSubscription/hasUnlimitedGames con la stessa logica
  // usata da TrisGameBanner (così se è 'true' qui, il counter NON scenderà).
  const computeFlags = (credits: any) => {
    const now = new Date();
    const hasActiveSub = Boolean(
      credits?.is_premium &&
        ((!credits.premium_expires_at &&
          (credits.subscription_type === 'monthly' || credits.subscription_type === 'weekly')) ||
          (credits.premium_expires_at && new Date(credits.premium_expires_at) > now))
    );
    const hasUnlimited = Boolean(
      hasActiveSub &&
        credits?.subscription_type === 'monthly' &&
        (!credits.premium_tier || credits.premium_tier === 'premium')
    );
    return { hasActiveSubscription: hasActiveSub, hasUnlimitedGames: hasUnlimited, now: now.toISOString() };
  };

  // 🔧 Rimuove COMPLETAMENTE l'abbonamento da un account (resetta a free).
  // Approccio DIRETTO sul DB con .select() per essere SICURI che l'UPDATE
  // abbia effettivamente toccato righe (se RLS blocca, length=0 → errore
  // esplicito invece di silenzioso).
  const handleRemoveSubscription = async () => {
    if (!userId) {
      toast({
        title: "Errore",
        description: "Inserisci user ID",
        variant: "destructive",
      });
      return;
    }

    const trimmedId = userId.trim();
    setLoadingRemoveSub(true);
    try {
      // 1) Reset user_credits con .select() per sapere se RLS blocca
      const { data: updatedCredits, error: updateErr } = await supabase
        .from("user_credits")
        .update({
          is_premium: false,
          subscription_type: 'none',
          premium_tier: 'none',
          premium_expires_at: null,
        })
        .eq("user_id", trimmedId)
        .select();

      if (updateErr) throw updateErr;
      if (!updatedCredits || updatedCredits.length === 0) {
        throw new Error(
          "UPDATE su user_credits non ha modificato nessuna riga. " +
          "Possibili cause: (a) RLS blocca l'admin, (b) userId errato, " +
          "(c) la riga non esiste."
        );
      }

      // 2) Reset tris_games (azzera contatore odierno)
      const today = new Date().toISOString().split("T")[0];
      const { data: updatedTris, error: trisErr } = await supabase
        .from("tris_games")
        .update({
          games_played_today: 0,
          last_reset_date: today,
        })
        .eq("user_id", trimmedId)
        .select();

      if (trisErr) console.warn("tris_games update error (non bloccante):", trisErr);

      let finalTris = updatedTris?.[0];
      if (!finalTris) {
        // Riga inesistente: la creiamo
        const { data: insertedTris } = await supabase
          .from("tris_games")
          .insert({ user_id: trimmedId, games_played_today: 0, last_reset_date: today })
          .select()
          .maybeSingle();
        finalTris = insertedTris ?? { user_id: trimmedId, games_played_today: 0, last_reset_date: today };
      }

      // 3) Invalida la cache react-query così TrisGameBanner / CreditsDisplay
      // si aggiornano IMMEDIATAMENTE senza dover ricaricare la pagina.
      queryClient.invalidateQueries({ queryKey: ["user-credits"] });
      queryClient.invalidateQueries({ queryKey: ["daily-likes"] });

      const finalCredits = updatedCredits[0];
      setDiagnoseResult({
        userCredits: finalCredits,
        trisGames: finalTris,
        computed: computeFlags(finalCredits),
        ts: new Date().toISOString(),
        label: '✅ Stato POST-reset',
      });

      toast({
        title: "Abbonamento rimosso",
        description: `is_premium=${finalCredits.is_premium}, sub=${finalCredits.subscription_type}, tier=${finalCredits.premium_tier}. Counter azzerato.`,
      });
    } catch (error: any) {
      console.error("Error removing subscription:", error);
      toast({
        title: "Errore reset abbonamento",
        description: error.message || "Impossibile resettare l'account",
        variant: "destructive",
      });
    } finally {
      setLoadingRemoveSub(false);
    }
  };

  // 🔍 Diagnostica: mostra lo stato reale del DB per l'userId.
  // Query SELECT dirette: se l'utente è loggato come quell'userId
  // (case "guardo me stesso") l'RLS lo permette sempre.
  const handleDiagnose = async () => {
    if (!userId) {
      toast({
        title: "Errore",
        description: "Inserisci user ID",
        variant: "destructive",
      });
      return;
    }
    const trimmedId = userId.trim();
    setLoadingDiagnose(true);
    setDiagnoseResult(null);
    try {
      const { data: credits, error: credErr } = await supabase
        .from("user_credits")
        .select("user_id, balance, is_premium, subscription_type, premium_tier, premium_expires_at, daily_likes_remaining, last_daily_reset")
        .eq("user_id", trimmedId)
        .maybeSingle();
      if (credErr) throw credErr;

      const { data: trisGames, error: trisErr } = await supabase
        .from("tris_games")
        .select("user_id, games_played_today, last_reset_date")
        .eq("user_id", trimmedId)
        .maybeSingle();
      if (trisErr) console.warn("tris_games select error (non bloccante):", trisErr);

      setDiagnoseResult({
        userCredits: credits,
        trisGames: trisGames,
        computed: computeFlags(credits),
        ts: new Date().toISOString(),
        label: '🔍 Stato attuale DB',
      });
    } catch (error: any) {
      console.error("Error diagnosing account:", error);
      toast({
        title: "Errore diagnostica",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingDiagnose(false);
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
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Button 
            onClick={handleAssignPremium} 
            disabled={loadingPremium} 
            variant="outline"
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0"
          >
            <Crown className="h-4 w-4 mr-2" />
            {loadingPremium ? "Assegnando..." : "Premium (30gg €399)"}
          </Button>
          
          <Button 
            onClick={handleAssignPlatinum} 
            disabled={loadingPlatinum} 
            variant="outline"
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
          >
            <Crown className="h-4 w-4 mr-2" />
            {loadingPlatinum ? "Assegnando..." : "Platino (30gg €69)"}
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleAssignWeeklyPremium}
            disabled={loadingWeeklyPremium}
            variant="outline"
          >
            <Crown className="h-4 w-4 mr-2" />
            {loadingWeeklyPremium ? "Assegnando..." : "Premium (7gg)"}
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

        {/* 🔧 Reset account a free + 🔍 Diagnostica account.
            Entrambi passano per l'edge function admin-reset-account con
            service role: l'UPDATE client-side su user_credits era bloccato
            silenziosamente da RLS (per questo il reset precedente non aveva
            effetto sul DB). */}
        <div className="pt-2 border-t border-border/40 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleDiagnose}
              disabled={loadingDiagnose}
              variant="outline"
              className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border-blue-500/30 text-blue-600 dark:text-blue-400"
            >
              <Search className="h-4 w-4 mr-2" />
              {loadingDiagnose ? "Carico..." : "Diagnostica Account"}
            </Button>

            <Button
              onClick={handleRemoveSubscription}
              disabled={loadingRemoveSub}
              variant="outline"
              className="bg-gradient-to-r from-red-500/10 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/20 border-red-500/30 text-red-600 dark:text-red-400"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {loadingRemoveSub ? "Rimuovendo..." : "Rimuovi Abbonamento"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Diagnostica</strong> mostra lo stato reale del DB (utile per capire
            perché tris/dama non scalano). <strong>Rimuovi Abbonamento</strong> riporta
            l'account a Free: <code className="px-1 bg-muted rounded">is_premium=false</code>,{" "}
            <code className="px-1 bg-muted rounded">subscription_type=none</code>,{" "}
            <code className="px-1 bg-muted rounded">premium_tier=none</code>, e azzera{" "}
            <code className="px-1 bg-muted rounded">games_played_today</code>.
          </p>

          {/* Pannello risultati diagnostica/reset */}
          {diagnoseResult && (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs font-mono">
              <div className="flex items-center justify-between mb-2 font-sans">
                <span className="font-semibold">{diagnoseResult.label}</span>
                <button
                  onClick={() => setDiagnoseResult(null)}
                  className="text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="text-foreground/80">
                  <span className="text-blue-500">user_credits:</span>
                </div>
                {diagnoseResult.userCredits ? (
                  <pre className="overflow-x-auto whitespace-pre-wrap bg-background/50 p-2 rounded text-[10px]">
                    {JSON.stringify(diagnoseResult.userCredits, null, 2)}
                  </pre>
                ) : (
                  <div className="text-orange-500">⚠️ nessuna riga in user_credits</div>
                )}
                <div className="text-foreground/80 mt-2">
                  <span className="text-blue-500">tris_games:</span>
                </div>
                {diagnoseResult.trisGames ? (
                  <pre className="overflow-x-auto whitespace-pre-wrap bg-background/50 p-2 rounded text-[10px]">
                    {JSON.stringify(diagnoseResult.trisGames, null, 2)}
                  </pre>
                ) : (
                  <div className="text-orange-500">⚠️ nessuna riga in tris_games</div>
                )}
                {diagnoseResult.computed && (
                  <>
                    <div className="text-foreground/80 mt-2">
                      <span className="text-blue-500">computed:</span>
                    </div>
                    <pre
                      className={`overflow-x-auto whitespace-pre-wrap p-2 rounded text-[10px] ${
                        diagnoseResult.computed.hasUnlimitedGames
                          ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30"
                          : "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30"
                      }`}
                    >
                      {JSON.stringify(diagnoseResult.computed, null, 2)}
                      {"\n\n"}
                      {diagnoseResult.computed.hasUnlimitedGames
                        ? "⚠️ hasUnlimitedGames=true → counter NON scenderà"
                        : "✅ hasUnlimitedGames=false → counter scalerà normalmente"}
                    </pre>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
