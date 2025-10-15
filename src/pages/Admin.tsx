import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { UserCreditsManager } from "@/components/admin/UserCreditsManager";
import { ProfileCreator } from "@/components/admin/ProfileCreator";
import { ChatMonitor } from "@/components/admin/ChatMonitor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminRole();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="h-12 w-12 animate-pulse mx-auto text-primary" />
          <p className="text-lg">Verifica permessi admin...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <Shield className="h-10 w-10 text-primary" />
                Pannello Admin
              </h1>
              <p className="text-muted-foreground mt-1">
                Gestione completa del sistema
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UserCreditsManager />
          <ProfileCreator />
        </div>

        <ChatMonitor />
      </div>
    </div>
  );
}
