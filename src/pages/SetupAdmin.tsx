import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SetupAdmin() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);

  const createAdminAccount = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-account', {
        body: { secret: "setup-admin-2025" }
      });

      if (error) throw error;

      setCredentials(data.credentials);
      toast({
        title: "Account admin creato!",
        description: "Le credenziali sono mostrate sotto",
      });
    } catch (e: any) {
      toast({
        title: "Errore",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Shield className="h-6 w-6 text-primary" />
            Setup Account Admin
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!credentials ? (
            <Button 
              onClick={createAdminAccount} 
              className="w-full" 
              disabled={loading}
            >
              {loading ? "Creazione..." : "Crea Account Admin"}
            </Button>
          ) : (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h3 className="font-bold text-lg">✅ Account Creato!</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Email:</p>
                  <p className="font-mono text-sm bg-background p-2 rounded">
                    {credentials.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Password:</p>
                  <p className="font-mono text-sm bg-background p-2 rounded">
                    {credentials.password}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Usa queste credenziali per accedere a /adminarrettu
              </p>
              <Button 
                onClick={() => window.location.href = "/adminarrettu"} 
                className="w-full mt-4"
              >
                Vai al Login Admin
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
