import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UserCreditsManager } from "@/components/admin/UserCreditsManager";
import { ProfileCreator } from "@/components/admin/ProfileCreator";
import { ProfileManager } from "@/components/admin/ProfileManager";
import { SupportChatMonitor } from "@/components/admin/SupportChatMonitor";
import { UserBanManager } from "@/components/admin/UserBanManager";
import { NotificationMonitor } from "@/components/admin/NotificationMonitor";
import { Shield, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminArrettu() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Check if already logged in
    const adminSession = sessionStorage.getItem("adminArrettu");
    if (adminSession === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = () => {
    if (nickname === "superadmin2025" && password === "AdminSecure!2025") {
      sessionStorage.setItem("adminArrettu", "true");
      setIsLoggedIn(true);
      toast({
        title: "Accesso effettuato",
        description: "Benvenuto nel pannello admin",
      });
    } else {
      toast({
        title: "Errore",
        description: "Credenziali non valide",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminArrettu");
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
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
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
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-2" />
            Logout
          </Button>
        </div>

        <UserBanManager />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UserCreditsManager />
          <ProfileCreator />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfileManager />
          <NotificationMonitor />
        </div>

        <SupportChatMonitor />
      </div>
    </div>
  );
}
