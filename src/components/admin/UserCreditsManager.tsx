import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Coins, Crown, Plus, XCircle, History, Send, Clock } from "lucide-react";

// 🗂️ Cronologia azioni admin (crediti/like/abbonamenti) salvata sul dispositivo.
//    Si auto-pulisce: vengono mostrate/salvate solo le voci delle ultime 24 ore.
const HISTORY_KEY = "adminarrettu_credits_history_v1";
const DAY_MS = 24 * 60 * 60 * 1000;

interface HistoryEntry {
  id: string;
  actionLabel: string;
  userId: string;
  adminEmail: string;
  reason: string;
  timestamp: number;
}

const loadHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const cutoff = Date.now() - DAY_MS;
    return (arr as HistoryEntry[]).filter((e) => e && typeof e.timestamp === "number" && e.timestamp >= cutoff);
  } catch {
    return [];
  }
};

const saveHistory = (entries: HistoryEntry[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // ignora errori di storage
  }
};

type ActionKey = "credits" | "likes" | "premium" | "platinum" | "weekly" | "remove";

const ACTION_TITLES: Record<ActionKey, string> = {
  credits: "Aggiungi Crediti",
  likes: "Aggiungi Like",
  premium: "Premium (30 giorni)",
  platinum: "Platino (30 giorni)",
  weekly: "Premium (7 giorni)",
  remove: "Rimuovi Abbonamento",
};

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
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingRemoveSub, setLoadingRemoveSub] = useState(false);

  // 📝 Pannello "Motivo" + cronologia
  const [pendingAction, setPendingAction] = useState<ActionKey | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string>("");

  // Recupera l'email dell'admin loggato (serve solo al fallback locale).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setAdminEmail(data.user?.email ?? "");
    });
  }, []);

  // Registra l'azione nella cronologia CONDIVISA su database (visibile a tutti
  // gli admin, email presa dal server). Se la RPC non e' ancora installata,
  // ripiega sul salvataggio locale del dispositivo.
  const recordHistory = async (actionLabel: string, targetUser: string, reasonText: string) => {
    try {
      const { error } = await (supabase as any).rpc("log_admin_credit_action", {
        p_action_label: actionLabel,
        p_target_user_id: targetUser,
        p_reason: reasonText,
      });
      if (error) throw error;
    } catch (err) {
      console.warn("RPC log_admin_credit_action non disponibile, uso fallback locale:", err);
      const cutoff = Date.now() - DAY_MS;
      const entry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        actionLabel,
        userId: targetUser,
        adminEmail: adminEmail || "Sconosciuto",
        reason: reasonText,
        timestamp: Date.now(),
      };
      saveHistory([entry, ...loadHistory()].filter((e) => e.timestamp >= cutoff));
    }
  };

  // Apre la cronologia caricandola dal database condiviso (fallback locale).
  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("get_admin_credit_actions");
      if (error) throw error;
      const rows = (data || []) as Array<{
        id: string;
        admin_email: string | null;
        action_label: string;
        target_user_id: string;
        reason: string;
        created_at: string;
      }>;
      setHistory(
        rows.map((r) => ({
          id: r.id,
          actionLabel: r.action_label,
          userId: r.target_user_id,
          adminEmail: r.admin_email || "—",
          reason: r.reason,
          timestamp: new Date(r.created_at).getTime(),
        }))
      );
    } catch (err) {
      console.warn("RPC get_admin_credit_actions non disponibile, uso fallback locale:", err);
      setHistory(loadHistory());
    } finally {
      setHistoryLoading(false);
    }
  };

  // Apre il pannello "Motivo" per l'azione scelta, dopo aver validato gli input.
  const requestAction = (key: ActionKey) => {
    if (!userId.trim()) {
      toast({ title: "Errore", description: "Inserisci lo User ID", variant: "destructive" });
      return;
    }
    if (key === "credits" && !creditsAmount) {
      toast({ title: "Errore", description: "Inserisci la quantità di crediti", variant: "destructive" });
      return;
    }
    if (key === "likes" && !likesAmount) {
      toast({ title: "Errore", description: "Inserisci la quantità di like", variant: "destructive" });
      return;
    }
    setReason("");
    setPendingAction(key);
  };

  // "Invia": valida il motivo, esegue l'azione e (se va a buon fine) registra
  // la voce in cronologia, poi chiude il pannello.
  const executeAction = async () => {
    if (!pendingAction) return;
    if (!reason.trim()) {
      toast({ title: "Errore", description: "Inserisci il motivo", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    let ok = false;
    try {
      switch (pendingAction) {
        case "credits":
          ok = await doAddCredits(reason.trim());
          break;
        case "likes":
          ok = await doAddLikes(reason.trim());
          break;
        case "premium":
          ok = await doAssignPremium(reason.trim());
          break;
        case "platinum":
          ok = await doAssignPlatinum(reason.trim());
          break;
        case "weekly":
          ok = await doAssignWeeklyPremium(reason.trim());
          break;
        case "remove":
          ok = await doRemoveSubscription(reason.trim());
          break;
      }
    } finally {
      setSubmitting(false);
    }
    if (ok) {
      setPendingAction(null);
      setReason("");
    }
  };

  const doAddCredits = async (reasonText: string): Promise<boolean> => {
    const targetUser = userId.trim();
    const amt = parseInt(creditsAmount);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-add-credits", {
        body: { userId: targetUser, creditsAmount: amt },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Errore sconosciuto");
      toast({ title: "Crediti aggiunti", description: `${amt} crediti aggiunti (nuovo saldo: ${data.newBalance})` });
      await recordHistory(`Aggiunti ${amt} crediti`, targetUser, reasonText);
      setUserId("");
      setCreditsAmount("");
      return true;
    } catch (error: any) {
      console.error("Error adding credits:", error);
      toast({ title: "Errore", description: error.message || "Impossibile aggiungere crediti", variant: "destructive" });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const doAddLikes = async (reasonText: string): Promise<boolean> => {
    const targetUser = userId.trim();
    const amt = parseInt(likesAmount);
    setLoadingLikes(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-add-likes", {
        body: { userId: targetUser, likesAmount: amt },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Errore sconosciuto");
      toast({ title: "Like Aggiunti", description: `${amt} like aggiunti (nuovo totale: ${data.newLikesRemaining})` });
      await recordHistory(`Aggiunti ${amt} like`, targetUser, reasonText);
      setUserId("");
      setLikesAmount("");
      return true;
    } catch (error: any) {
      console.error("Error adding likes:", error);
      toast({ title: "Errore", description: error.message || "Impossibile aggiungere like", variant: "destructive" });
      return false;
    } finally {
      setLoadingLikes(false);
    }
  };

  const doAssignPremium = async (reasonText: string): Promise<boolean> => {
    const targetUser = userId.trim();
    setLoadingPremium(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const { error } = await supabase
        .from("user_credits")
        .update({
          is_premium: true,
          subscription_type: "monthly",
          premium_tier: "premium",
          premium_expires_at: expiresAt.toISOString(),
          balance: 999,
          daily_likes_remaining: 999,
        })
        .eq("user_id", targetUser);
      if (error) throw error;
      toast({ title: "Premium Mensile Assegnato", description: "Abbonamento premium di 30 giorni assegnato" });
      await recordHistory("Premium 30 giorni", targetUser, reasonText);
      setUserId("");
      return true;
    } catch (error: any) {
      console.error("Error assigning premium:", error);
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setLoadingPremium(false);
    }
  };

  const doAssignWeeklyPremium = async (reasonText: string): Promise<boolean> => {
    const targetUser = userId.trim();
    setLoadingWeeklyPremium(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const { error } = await supabase
        .from("user_credits")
        .update({
          is_premium: true,
          subscription_type: "weekly",
          premium_expires_at: expiresAt.toISOString(),
          balance: 40,
          daily_likes_remaining: 30,
          daily_free_chats_remaining: 5,
        })
        .eq("user_id", targetUser);
      if (error) throw error;
      toast({ title: "Premium Settimanale Assegnato", description: "Abbonamento premium di 7 giorni assegnato" });
      await recordHistory("Premium 7 giorni", targetUser, reasonText);
      setUserId("");
      return true;
    } catch (error: any) {
      console.error("Error assigning weekly premium:", error);
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setLoadingWeeklyPremium(false);
    }
  };

  const doAssignPlatinum = async (reasonText: string): Promise<boolean> => {
    const targetUser = userId.trim();
    setLoadingPlatinum(true);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      const { error } = await supabase
        .from("user_credits")
        .update({
          is_premium: true,
          subscription_type: "monthly",
          premium_tier: "standard",
          premium_expires_at: expiresAt.toISOString(),
          balance: 70,
          daily_likes_remaining: 40,
        })
        .eq("user_id", targetUser);
      if (error) throw error;
      toast({ title: "Platino Assegnato", description: "Abbonamento Platino di 30 giorni assegnato (€69,99)" });
      await recordHistory("Platino 30 giorni", targetUser, reasonText);
      setUserId("");
      return true;
    } catch (error: any) {
      console.error("Error assigning platinum:", error);
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setLoadingPlatinum(false);
    }
  };

  // 🔧 Rimuove COMPLETAMENTE l'abbonamento da un account (resetta a free).
  const doRemoveSubscription = async (reasonText: string): Promise<boolean> => {
    const trimmedId = userId.trim();
    setLoadingRemoveSub(true);
    try {
      const { data: updatedCredits, error: updateErr } = await supabase
        .from("user_credits")
        .update({
          is_premium: false,
          subscription_type: "none",
          premium_tier: "none",
          premium_expires_at: null,
        })
        .eq("user_id", trimmedId)
        .select();

      if (updateErr) throw updateErr;
      if (!updatedCredits || updatedCredits.length === 0) {
        throw new Error(
          "UPDATE su user_credits non ha modificato nessuna riga. " +
            "Possibili cause: (a) RLS blocca l'admin, (b) userId errato, (c) la riga non esiste."
        );
      }

      const today = new Date().toISOString().split("T")[0];
      const { data: updatedTris, error: trisErr } = await supabase
        .from("tris_games")
        .update({ games_played_today: 0, last_reset_date: today })
        .eq("user_id", trimmedId)
        .select();
      if (trisErr) console.warn("tris_games update error (non bloccante):", trisErr);
      if (!updatedTris?.[0]) {
        await supabase
          .from("tris_games")
          .insert({ user_id: trimmedId, games_played_today: 0, last_reset_date: today });
      }

      queryClient.invalidateQueries({ queryKey: ["user-credits"] });
      queryClient.invalidateQueries({ queryKey: ["daily-likes"] });

      toast({ title: "Abbonamento rimosso", description: "Account riportato a Free. Counter partite azzerato." });
      await recordHistory("Rimosso abbonamento", trimmedId, reasonText);
      setUserId("");
      return true;
    } catch (error: any) {
      console.error("Error removing subscription:", error);
      toast({ title: "Errore reset abbonamento", description: error.message || "Impossibile resettare l'account", variant: "destructive" });
      return false;
    } finally {
      setLoadingRemoveSub(false);
    }
  };

  const formatWhen = (ts: number) =>
    new Date(ts).toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Gestione crediti e abbonamenti Utente
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={openHistory}
          >
            <History className="h-4 w-4" />
            Cronologia
          </Button>
        </div>
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
        {/* Tutti i pulsanti stessa larghezza (adattata al testo piu' lungo),
            in colonna centrata e ordinata. */}
        {/* Sezione: Crediti & Like */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            Crediti & Like
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={() => requestAction("credits")} disabled={loading} className="h-11 w-full justify-center">
              <Coins className="h-4 w-4 mr-2" />
              {loading ? "Aggiungendo..." : "Aggiungi Crediti"}
            </Button>
            <Button onClick={() => requestAction("likes")} disabled={loadingLikes} variant="secondary" className="h-11 w-full justify-center">
              <Plus className="h-4 w-4 mr-2" />
              {loadingLikes ? "Aggiungendo..." : "Aggiungi Like"}
            </Button>
          </div>
        </div>

        {/* Sezione: Abbonamenti (tier a due righe: titolo + durata/prezzo) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            Abbonamenti
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={() => requestAction("premium")}
              disabled={loadingPremium}
              variant="outline"
              className="h-auto py-2.5 w-full flex-col gap-0.5 bg-gradient-to-br from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0"
            >
              {loadingPremium ? (
                <span className="text-sm">Assegnando...</span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-sm font-semibold"><Crown className="h-4 w-4" /> Premium</span>
                  <span className="text-[11px] font-medium opacity-90">30 giorni · €399</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => requestAction("platinum")}
              disabled={loadingPlatinum}
              variant="outline"
              className="h-auto py-2.5 w-full flex-col gap-0.5 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
            >
              {loadingPlatinum ? (
                <span className="text-sm">Assegnando...</span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-sm font-semibold"><Crown className="h-4 w-4" /> Platino</span>
                  <span className="text-[11px] font-medium opacity-90">30 giorni · €69</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => requestAction("weekly")}
              disabled={loadingWeeklyPremium}
              variant="outline"
              className="h-auto py-2.5 w-full flex-col gap-0.5"
            >
              {loadingWeeklyPremium ? (
                <span className="text-sm">Assegnando...</span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-sm font-semibold"><Crown className="h-4 w-4" /> Premium</span>
                  <span className="text-[11px] font-medium text-muted-foreground">7 giorni</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sezione: Gestione account */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            Gestione account
          </p>
          <Button
            onClick={() => requestAction("remove")}
            disabled={loadingRemoveSub}
            variant="outline"
            className="h-11 w-full justify-center bg-gradient-to-r from-red-500/10 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/20 border-red-500/30 text-red-600 dark:text-red-400"
          >
            <XCircle className="h-4 w-4 mr-2" />
            {loadingRemoveSub ? "Rimuovendo..." : "Rimuovi Abbonamento"}
          </Button>
        </div>
      </CardContent>

      {/* Pannello MOTIVO: appare al click su un'azione, esegue su Invia */}
      <Dialog open={!!pendingAction} onOpenChange={(o) => { if (!o && !submitting) { setPendingAction(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo</DialogTitle>
            <DialogDescription>
              {pendingAction ? ACTION_TITLES[pendingAction] : ""}
              {userId.trim() ? ` · Utente: ${userId.trim()}` : ""}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Scrivi il motivo per cui stai assegnando questo..."
            rows={4}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPendingAction(null); setReason(""); }} disabled={submitting}>
              Annulla
            </Button>
            <Button onClick={executeAction} disabled={submitting || !reason.trim()} className="gap-2">
              <Send className="h-4 w-4" />
              {submitting ? "Invio..." : "Invia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pannello CRONOLOGIA: voci delle ultime 24 ore */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Cronologia (ultime 24 ore)
            </DialogTitle>
            <DialogDescription>
              Crediti, like e abbonamenti assegnati. Le voci si rimuovono da sole dopo 24 ore.
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Caricamento...</div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nessuna voce nelle ultime 24 ore.
            </div>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-3">
              <div className="space-y-3">
                {history.map((e) => (
                  <div key={e.id} className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-primary">{e.actionLabel}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatWhen(e.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground break-all">Utente: {e.userId}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground break-all">
                      Admin: {e.adminEmail || "—"}
                    </p>
                    <p className="mt-1 text-sm break-words">
                      <span className="text-muted-foreground">Motivo: </span>
                      {e.reason}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
