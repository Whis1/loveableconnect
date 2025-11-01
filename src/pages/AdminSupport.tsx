import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SupportChatMonitor } from "@/components/admin/SupportChatMonitor";
import { Shield, ArrowLeft, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";

export default function AdminSupport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    toast({
      title: "Logout effettuato",
      description: "Sei stato disconnesso",
    });
    navigate("/adminarrettu");
  };

  if (!isLoggedIn || (!adminLoading && !isAdmin)) {
    navigate("/adminarrettu");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Shield className="h-10 w-10 text-primary" />
              Supporto Clienti
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestione richieste di supporto
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/adminarrettu")}>
              <ArrowLeft className="h-5 w-5 mr-2" />
              Torna al Pannello
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <SupportChatMonitor />
      </div>
    </div>
  );
}
