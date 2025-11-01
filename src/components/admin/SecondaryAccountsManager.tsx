import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Trash2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SecondaryAccount {
  id: string;
  nickname: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

export const SecondaryAccountsManager = () => {
  const [accounts, setAccounts] = useState<SecondaryAccount[]>([]);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_secondary_accounts")
        .select("id, nickname, created_at, last_login, is_active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Errore caricamento account:", error);
      toast.error("Errore nel caricamento degli account");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim() || !password.trim()) {
      toast.error("Compila tutti i campi");
      return;
    }

    if (nickname.length < 3 || nickname.length > 30) {
      toast.error("Il nickname deve avere 3-30 caratteri");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(nickname)) {
      toast.error("Il nickname può contenere solo lettere, numeri e underscore");
      return;
    }

    if (password.length < 6) {
      toast.error("La password deve avere almeno 6 caratteri");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke("admin-secondary-create", {
        body: { nickname, password },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Errore durante la creazione");
      }

      toast.success("Account creato con successo");
      setNickname("");
      setPassword("");
      fetchAccounts();
    } catch (error: any) {
      console.error("Errore creazione account:", error);
      toast.error(error.message || "Errore nella creazione dell'account");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, accountNickname: string) => {
    if (!confirm(`Vuoi eliminare l'account ${accountNickname}?`)) return;

    try {
      const { error } = await supabase
        .from("admin_secondary_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Account eliminato");
      fetchAccounts();
    } catch (error) {
      console.error("Errore eliminazione:", error);
      toast.error("Errore nell'eliminazione dell'account");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("admin_secondary_accounts")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(currentStatus ? "Account disattivato" : "Account attivato");
      fetchAccounts();
    } catch (error) {
      console.error("Errore modifica stato:", error);
      toast.error("Errore nella modifica dello stato");
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          Account Admin Secondari
        </CardTitle>
        <CardDescription>
          Crea account per accedere a /chattors (solo nickname e password)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form Creazione */}
        <form onSubmit={handleCreate} className="space-y-4 p-4 bg-background/50 rounded-lg border border-border">
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="es. admin_support"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">
              3-30 caratteri, solo lettere, numeri e underscore
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caratteri"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            <UserPlus className="h-4 w-4 mr-2" />
            {loading ? "Creazione..." : "Crea Account"}
          </Button>
        </form>

        {/* Lista Account */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Account Esistenti ({accounts.length})</h3>
          <ScrollArea className="h-[300px] rounded-lg border border-border bg-background/50">
            <div className="p-4 space-y-2">
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nessun account creato ancora
                </p>
              ) : (
                accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{account.nickname}</span>
                        <Badge variant={account.is_active ? "default" : "secondary"}>
                          {account.is_active ? "Attivo" : "Disattivato"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Creato: {new Date(account.created_at).toLocaleDateString("it-IT")}
                        {account.last_login && (
                          <> • Ultimo login: {new Date(account.last_login).toLocaleDateString("it-IT")}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(account.id, account.is_active)}
                      >
                        {account.is_active ? "Disattiva" : "Attiva"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(account.id, account.nickname)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
