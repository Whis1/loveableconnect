import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PremiumSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verifySubscription = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!sessionId) {
        setVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-subscription", {
          body: { session_id: sessionId },
        });

        if (error) throw error;

        if (data?.success) {
          setSuccess(true);
          toast({
            title: "Benvenuto nel Premium!",
            description: "Il tuo abbonamento è ora attivo",
          });
        }
      } catch (error: any) {
        console.error("Error verifying subscription:", error);
        toast({
          title: "Errore",
          description: "Impossibile verificare l'abbonamento",
          variant: "destructive",
        });
      } finally {
        setVerifying(false);
      }
    };

    verifySubscription();
  }, [searchParams, toast]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              Verifica in corso...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Stiamo attivando il tuo abbonamento Premium, attendere prego...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 border-2 border-amber-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {success ? (
              <>
                <Crown className="h-6 w-6 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Benvenuto nel Premium!</span>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-destructive" />
                Abbonamento Non Attivato
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <>
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 p-4 rounded-lg space-y-2">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  Il tuo abbonamento Premium è ora attivo!
                </p>
                <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                  <li>✓ Crediti illimitati per messaggi</li>
                  <li>✓ Visualizzazione like gratis</li>
                  <li>✓ Badge Premium esclusivo</li>
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => navigate("/")}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
                >
                  Inizia a Chattare
                </Button>
                <Button variant="outline" onClick={() => navigate("/credits")}>
                  Gestisci Abbonamento
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                L'attivazione dell'abbonamento non è stata completata o si è verificato un errore.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/credits")}>
                  Riprova
                </Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Torna alla Home
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PremiumSuccess;