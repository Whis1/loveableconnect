import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Crown, Shield, UserPlus, Loader2, Trash2 } from "lucide-react";
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
        {/* Form promozione */}
        <form
          onSubmit={handlePromote}
          className="space-y-4 p-4 rounded-lg bg-background/50 border border-border"
        >
          <p className="text-xs text-muted-foreground leading-relaxed">
            L'utente da promuovere deve <strong>prima registrarsi normalmente</strong> via{" "}
            <code className="px-1 bg-muted rounded">/auth</code> con email e password. Poi inserisci
            qui la sua email e scegli il tier per dargli accesso a{" "}
            <code className="px-1 bg-muted rounded">/adminarrettu</code>.
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
