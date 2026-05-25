import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, UserPlus, Loader2, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TieredAdminRow {
  user_id: string;
  email: string;
  admin_tier: number | null;
  created_at: string;
}

/**
 * 👑 Gestione admin con tier 1/2.
 *
 * - Tier 1 = full access (vede tutti i pulsanti tra cui Profili&Chat e Creazione Profili)
 * - Tier 2 = accesso ridotto (no Profili&Chat, no Creazione Profili)
 *
 * Solo admin di tier 1 vedono questo componente.
 *
 * Workflow:
 *   1) Il nuovo admin si registra normalmente via /auth (email + password)
 *   2) L'admin tier 1 inserisce qui la sua email + tier desiderato → promuove
 *   3) Da quel momento il nuovo admin può entrare in /adminarrettu
 */
export const AdminTierManager = () => {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<TieredAdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<"1" | "2">("2");
  const [promoting, setPromoting] = useState(false);
  const [demotingId, setDemotingId] = useState<string | null>(null);

  // 🆕 Form 'Crea da zero' (chiama edge function admin-create-tiered)
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newTier, setNewTier] = useState<"1" | "2">("2");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_tiered" as any);
      if (error) throw error;
      setAdmins((data ?? []) as TieredAdminRow[]);
    } catch (e: any) {
      console.error("fetchAdmins error", e);
      toast({
        title: "Errore caricamento admin",
        description: e?.message ?? "Impossibile leggere la lista admin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Errore", description: "Inserisci una email", variant: "destructive" });
      return;
    }
    setPromoting(true);
    try {
      const { data, error } = await supabase.rpc("admin_promote_to_tier" as any, {
        p_email: email.trim(),
        p_tier: parseInt(tier, 10),
      });
      if (error) throw error;
      const result = Array.isArray(data) ? (data[0] as any) : (data as any);
      if (!result?.success) {
        throw new Error(result?.message ?? "Errore durante la promozione");
      }
      toast({ title: "✓ Promosso", description: result.message });
      setEmail("");
      await fetchAdmins();
    } catch (e: any) {
      console.error("handlePromote error", e);
      toast({
        title: "Errore",
        description: e?.message ?? "Impossibile promuovere l'utente",
        variant: "destructive",
      });
    } finally {
      setPromoting(false);
    }
  };

  // 🆕 Creazione admin da zero SENZA edge function:
  // 1) Salva la sessione admin corrente
  // 2) supabase.auth.signUp con la nuova email/password (sostituisce la
  //    sessione corrente, ma noi la ripristiniamo subito dopo)
  // 3) Ripristina la sessione admin tramite setSession
  // 4) Chiama RPC admin_promote_to_tier(email, tier, p_delete_profile=true)
  //    → assegna role+tier E cancella il profile auto-generato dal trigger
  //    → l'admin non apparirà in bacheca / esplorazione / ricerca
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast({ title: "Errore", description: "Email non valida", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Errore", description: "Password troppo corta (min 6)", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      // 1) Salva tokens della sessione admin
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      if (!adminSession) {
        throw new Error("Sessione admin non valida. Ri-effettua il login.");
      }
      const adminAccessToken = adminSession.access_token;
      const adminRefreshToken = adminSession.refresh_token;

      // 2) Crea il nuovo utente via signUp (pubblico). Sostituisce la
      // sessione corrente con quella del nuovo utente (se autoconfirm on)
      // o resta admin (se autoconfirm off).
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: newEmail.trim().toLowerCase(),
        password: newPassword,
        options: {
          data: {
            full_name: `Admin Tier ${newTier}`,
            nickname: newEmail.split("@")[0],
            is_admin_account: true,
          },
        },
      });
      if (signUpErr) throw signUpErr;
      if (!signUpData.user) throw new Error("Creazione utente fallita");

      // 3) Ripristina sessione admin (sempre, per sicurezza)
      const { error: restoreErr } = await supabase.auth.setSession({
        access_token: adminAccessToken,
        refresh_token: adminRefreshToken,
      });
      if (restoreErr) {
        console.warn("Errore restore sessione admin (non bloccante):", restoreErr);
      }

      // 4) Chiama RPC con p_delete_profile=true per assegnare tier +
      // cancellare il profile generato dal trigger handle_new_user
      const { data: promoteData, error: promoteErr } = await supabase.rpc(
        "admin_promote_to_tier" as any,
        {
          p_email: newEmail.trim().toLowerCase(),
          p_tier: parseInt(newTier, 10),
          p_delete_profile: true,
        }
      );
      if (promoteErr) throw promoteErr;
      const result = Array.isArray(promoteData) ? (promoteData[0] as any) : (promoteData as any);
      if (!result?.success) {
        throw new Error(result?.message ?? "Errore promozione tier");
      }

      toast({
        title: "✓ Admin creato",
        description: `Email: ${newEmail} · Tier ${newTier}. Salva la password.`,
      });
      setNewEmail("");
      setNewPassword("");
      setShowNewPassword(false);
      await fetchAdmins();
    } catch (e: any) {
      console.error("handleCreate error", e);
      toast({
        title: "Errore creazione",
        description: e?.message ?? "Impossibile creare l'account admin",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDemote = async (row: TieredAdminRow) => {
    if (!confirm(`Vuoi revocare i permessi admin di ${row.email}?`)) return;
    setDemotingId(row.user_id);
    try {
      const { data, error } = await supabase.rpc("admin_demote" as any, {
        p_user_id: row.user_id,
      });
      if (error) throw error;
      const result = Array.isArray(data) ? (data[0] as any) : (data as any);
      if (!result?.success) {
        throw new Error(result?.message ?? "Errore durante la revoca");
      }
      toast({ title: "✓ Revocato", description: result.message });
      await fetchAdmins();
    } catch (e: any) {
      console.error("handleDemote error", e);
      toast({
        title: "Errore",
        description: e?.message ?? "Impossibile revocare l'admin",
        variant: "destructive",
      });
    } finally {
      setDemotingId(null);
    }
  };

  const renderTierBadge = (t: number | null) => {
    const tierNum = t ?? 1;
    if (tierNum === 1) {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 gap-1">
          <Crown className="h-3 w-3" />
          Tier 1 — Full
        </Badge>
      );
    }
    return (
      <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 gap-1">
        <Shield className="h-3 w-3" />
        Tier 2 — Ridotto
      </Badge>
    );
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          Account Admin (Tier 1 / Tier 2)
        </CardTitle>
        <CardDescription>
          <strong>Tier 1</strong> = accesso completo (incluso Profili & Chat e Creazione Profili).{" "}
          <strong>Tier 2</strong> = accesso ridotto (no Profili & Chat, no Creazione Profili).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 🆕 Form CREA DA ZERO: edge function admin-create-tiered */}
        <form
          onSubmit={handleCreate}
          className="space-y-4 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <Plus className="h-5 w-5 text-primary" />
            <h3 className="font-bold">Crea Admin da Zero</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Crea un nuovo account admin con email + password personalizzate. Il profilo NON
            apparirà nella bacheca utenti. Usa email random/dedicate per gli admin di staff.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="es. admin1@loveableconnect.internal"
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 caratteri"
                  disabled={creating}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-tier">Tier</Label>
              <Select
                value={newTier}
                onValueChange={(v) => setNewTier(v as "1" | "2")}
                disabled={creating}
              >
                <SelectTrigger id="new-tier" className="min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tier 1 (Full)</SelectItem>
                  <SelectItem value="2">Tier 2 (Ridotto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={creating} className="w-full">
            {creating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Crea Account Admin
          </Button>
        </form>

        {/* Form promozione utente esistente */}
        <form
          onSubmit={handlePromote}
          className="space-y-4 p-4 rounded-lg bg-background/50 border border-border"
        >
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-bold">Promuovi Utente Esistente</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Se l'utente è già registrato via <code className="px-1 bg-muted rounded">/auth</code>,
            inserisci la sua email per promuoverlo ad admin (non crea un nuovo account).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="promote-email">Email utente</Label>
              <Input
                id="promote-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="utente@example.com"
                disabled={promoting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promote-tier">Tier</Label>
              <Select value={tier} onValueChange={(v) => setTier(v as "1" | "2")} disabled={promoting}>
                <SelectTrigger id="promote-tier" className="min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tier 1 (Full)</SelectItem>
                  <SelectItem value="2">Tier 2 (Ridotto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="invisible">.</Label>
              <Button type="submit" disabled={promoting} className="w-full md:w-auto">
                {promoting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Promuovi
              </Button>
            </div>
          </div>
        </form>

        {/* Lista admin */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Admin attivi ({admins.length})</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nessun admin trovato (insolito: dovresti vedere almeno te stesso).
            </p>
          ) : (
            <div className="space-y-2">
              {admins.map((row) => (
                <div
                  key={row.user_id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{row.email}</span>
                      {renderTierBadge(row.admin_tier)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Promosso: {new Date(row.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDemote(row)}
                    disabled={demotingId === row.user_id}
                    title="Revoca admin"
                  >
                    {demotingId === row.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
