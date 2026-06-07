import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserCreditsManager } from "@/components/admin/UserCreditsManager";
import { UserBanManager } from "@/components/admin/UserBanManager";
import { UserReportsMonitor } from "@/components/admin/UserReportsMonitor";
import { BannerManager } from "@/components/admin/BannerManager";
import { EmailTemplateManager } from "@/components/admin/EmailTemplateManager";
import { Shield, LogOut, MessageSquare, UserPlus, Mail, Megaphone, Loader2, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useUnreadSupportMessages } from "@/hooks/useUnreadSupportMessages";
import { markCurrentUserOffline } from "@/hooks/usePresenceTracking";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminArrettu() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [inboxAllDialogOpen, setInboxAllDialogOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const { isAdmin, adminTier, loading: adminLoading } = useAdminRole();
  // Tier 1 = full access. Tier 2 = ridotto (no Profili & Chat, no Creazione).
  // Default a 1 se NULL (admin pre-migration, retrocompatibile).
  const isTier1 = (adminTier ?? 1) === 1;
  // 🔔 Conta messaggi non letti dal supporto utenti + beep automatico al nuovo
  const { unreadCount: unreadSupportCount } = useUnreadSupportMessages();

  // 🔒 Pannelli protetti (Banner + Template Email): chiusi di default, apribili
  //    a tendina solo dopo aver inserito la password una volta. L'accesso e'
  //    salvato sul database per ogni admin.
  const [panelsUnlocked, setPanelsUnlocked] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [panelPassword, setPanelPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [pendingPanel, setPendingPanel] = useState<"banner" | "email" | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Verifica se questo admin ha gia' sbloccato i pannelli protetti.
  useEffect(() => {
    if (isAdmin !== true) return;
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc("has_admin_panel_access");
        if (error) throw error;
        setPanelsUnlocked(data === true);
      } catch {
        // fallback locale finche' la migrazione non e' applicata
        setPanelsUnlocked(localStorage.getItem("admin_panels_unlocked") === "1");
      }
    })();
  }, [isAdmin]);

  const handlePanelToggle = (panel: "banner" | "email") => {
    if (panelsUnlocked) {
      if (panel === "banner") setBannerOpen((v) => !v);
      else setEmailOpen((v) => !v);
    } else {
      setPendingPanel(panel);
      setPanelPassword("");
      setPasswordDialogOpen(true);
    }
  };

  const submitPanelPassword = async () => {
    setUnlocking(true);
    try {
      let ok = false;
      try {
        const { data, error } = await (supabase as any).rpc("unlock_admin_panels", {
          p_password: panelPassword,
        });
        if (error) throw error;
        ok = data === true;
      } catch {
        // fallback locale (RPC non ancora installata)
        if (panelPassword === "39i4mdwe") {
          localStorage.setItem("admin_panels_unlocked", "1");
          ok = true;
        }
      }
      if (ok) {
        setPanelsUnlocked(true);
        setPasswordDialogOpen(false);
        setPanelPassword("");
        if (pendingPanel === "banner") setBannerOpen(true);
        if (pendingPanel === "email") setEmailOpen(true);
        toast({ title: "Pannelli sbloccati", description: "Accesso salvato: non dovrai reinserire la password." });
      } else {
        toast({ title: "Password errata", description: "La password inserita non e' corretta", variant: "destructive" });
      }
    } finally {
      setUnlocking(false);
    }
  };

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: nickname,
        password,
      });
      if (error) throw error;
      toast({
        title: "Accesso effettuato",
        description: "Benvenuto nel pannello admin",
      });
    } catch (e: any) {
      toast({
        title: "Errore",
        description: e.message || "Credenziali non valide",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await markCurrentUserOffline();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setNickname("");
    setPassword("");
    toast({
      title: "Logout effettuato",
      description: "Sei stato disconnesso",
    });
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast({
        title: "Errore",
        description: "Il messaggio non può essere vuoto",
        variant: "destructive",
      });
      return;
    }

    setSendingBroadcast(true);
    try {
      // RPC: invia a tutti, registra in Cronologia Azioni e rende il messaggio
      // eliminabile (batch). Fallback alla edge function se la RPC non c'e'.
      let count = 0;
      const rpc = await (supabase as any).rpc("send_inbox_to_all", { p_message: broadcastMessage });
      if (!rpc.error && rpc.data) {
        const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
        count = row?.count ?? 0;
      } else {
        const { data, error } = await supabase.functions.invoke('admin-send-inbox-to-all', {
          body: { message: broadcastMessage },
        });
        if (error) throw error;
        count = data?.count ?? 0;
      }

      toast({
        title: "Messaggio inviato!",
        description: `Inviato a ${count} utenti`,
      });

      setBroadcastMessage("");
      setInboxAllDialogOpen(false);
    } catch (error: any) {
      console.error('Error sending broadcast:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'invio",
        variant: "destructive",
      });
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Shield className="h-6 w-6 text-primary" />
              Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              Accedi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  // Se loggato ma stiamo ancora controllando il ruolo (isAdmin === null o adminLoading),
  // mostra spinner invece di "Permessi insufficienti" per evitare il flash brutto
  // tra signInWithPassword e il completamento del check user_roles.
  if (isLoggedIn && (adminLoading || isAdmin === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se loggato ma confermatamente senza ruolo admin
  if (isLoggedIn && isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Permessi insufficienti</CardTitle>
          </CardHeader>
          <CardContent>
            Per accedere al pannello admin il tuo account deve avere il ruolo Admin.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Shield className="h-10 w-10 text-primary" />
              Pannello Admin
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestione completa del sistema
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Profili & Chat + Creazione Profili: solo per admin tier 1 (full access) */}
            {isTier1 && (
              <>
                <Button variant="outline" onClick={() => navigate("/admin/profiles")}>
                  Profili & Chat
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/create-profile")}
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Creazione Profili
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => navigate("/admin/support")}
              className={
                unreadSupportCount > 0
                  ? "relative bg-red-500/20 border-red-500 text-red-100 hover:bg-red-500/30 animate-pulse shadow-lg shadow-red-500/40"
                  : "relative"
              }
            >
              <MessageSquare className={`h-5 w-5 mr-2 ${unreadSupportCount > 0 ? 'text-red-300' : ''}`} />
              Supporto Clienti
              {unreadSupportCount > 0 && (
                <>
                  {/* Badge count */}
                  <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {unreadSupportCount}
                  </span>
                  {/* Pallino ping animato in alto a destra */}
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </>
              )}
            </Button>
            <Dialog open={inboxAllDialogOpen} onOpenChange={setInboxAllDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Megaphone className="h-5 w-5 mr-2" />
                  Inbox ALL
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invia Messaggio a Tutti gli Utenti</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="broadcast-message">Messaggio</Label>
                    <Textarea
                      id="broadcast-message"
                      placeholder="Scrivi il messaggio da inviare a tutti gli utenti..."
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      rows={6}
                    />
                  </div>
                  <Button 
                    onClick={handleSendBroadcast} 
                    disabled={sendingBroadcast || !broadcastMessage.trim()}
                    className="w-full"
                  >
                    {sendingBroadcast ? "Invio in corso..." : "Invia a Tutti"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <UserBanManager />

        <UserReportsMonitor />

        <UserCreditsManager />
        
        {/* 🔒 Pannello Banner — a tendina, protetto da password */}
        <Card>
          <button
            type="button"
            onClick={() => handlePanelToggle("banner")}
            className="w-full flex items-center justify-between gap-2 p-6 text-left hover:bg-muted/30 transition-colors rounded-t-lg"
          >
            <span className="flex items-center gap-2 text-lg font-semibold">
              <Megaphone className="h-5 w-5" />
              Gestione Banner Pubblicitari
            </span>
            {panelsUnlocked ? (
              bannerOpen ? <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Lock className="h-4 w-4" /> Protetto
              </span>
            )}
          </button>
          {panelsUnlocked && bannerOpen && (
            <CardContent className="pt-0">
              <BannerManager bare />
            </CardContent>
          )}
        </Card>

        {/* 🔒 Pannello Template Email — a tendina, protetto da password */}
        <Card>
          <button
            type="button"
            onClick={() => handlePanelToggle("email")}
            className="w-full flex items-center justify-between gap-2 p-6 text-left hover:bg-muted/30 transition-colors rounded-t-lg"
          >
            <span className="flex items-center gap-2 text-lg font-semibold">
              <Mail className="h-5 w-5" />
              Gestione Template Email
            </span>
            {panelsUnlocked ? (
              emailOpen ? <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Lock className="h-4 w-4" /> Protetto
              </span>
            )}
          </button>
          {panelsUnlocked && emailOpen && (
            <CardContent className="pt-0">
              <EmailTemplateManager />
            </CardContent>
          )}
        </Card>

      </div>

      {/* Dialog password per sbloccare i pannelli protetti */}
      <Dialog open={passwordDialogOpen} onOpenChange={(o) => { if (!unlocking) setPasswordDialogOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Pannelli protetti
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Inserisci la password per sbloccare Banner Pubblicitari e Template Email.
            Una volta inserita, l'accesso resta salvato per il tuo account.
          </p>
          <Input
            type="password"
            value={panelPassword}
            onChange={(e) => setPanelPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && panelPassword && !unlocking) submitPanelPassword();
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)} disabled={unlocking}>
              Annulla
            </Button>
            <Button onClick={submitPanelPassword} disabled={unlocking || !panelPassword}>
              {unlocking ? "Verifico..." : "Sblocca"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
