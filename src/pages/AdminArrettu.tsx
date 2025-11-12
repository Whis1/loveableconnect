import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UserCreditsManager } from "@/components/admin/UserCreditsManager";
import { UserBanManager } from "@/components/admin/UserBanManager";
import { UserReportsMonitor } from "@/components/admin/UserReportsMonitor";
import { BannerManager } from "@/components/admin/BannerManager";
import { TerritoryConnectionsManager } from "@/components/admin/TerritoryConnectionsManager";
import { Shield, LogOut, MessageSquare, UserPlus, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function AdminArrettu() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [risikoDialogOpen, setRisikoDialogOpen] = useState(false);
  const { isAdmin, loading: adminLoading } = useAdminRole();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

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
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setNickname("");
    setPassword("");
    toast({
      title: "Logout effettuato",
      description: "Sei stato disconnesso",
    });
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


  // Se loggato ma senza ruolo admin
  if (isLoggedIn && !adminLoading && !isAdmin) {
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
          <div className="flex gap-2">
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
            <Button 
              variant="outline" 
              onClick={() => navigate("/admin/support")}
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Supporto Clienti
            </Button>
            <Dialog open={risikoDialogOpen} onOpenChange={setRisikoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Map className="h-5 w-5 mr-2" />
                  Conquistiator
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Gestione Territori Conquistiator</DialogTitle>
                </DialogHeader>
                <TerritoryConnectionsManager />
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
        
        <BannerManager />
      </div>
    </div>
  );
}
