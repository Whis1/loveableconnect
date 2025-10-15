import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PurchaseSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [creditsAdded, setCreditsAdded] = useState(0);

  useEffect(() => {
    const verifyPurchase = async () => {
      const sessionId = searchParams.get("session_id");
      
      if (!sessionId) {
        setVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });

        if (error) throw error;

        if (data?.success) {
          setSuccess(true);
          setCreditsAdded(data.credits_added);
          toast({
            title: "Acquisto completato!",
            description: `${data.credits_added} crediti aggiunti al tuo account`,
          });
        }
      } catch (error: any) {
        console.error("Error verifying purchase:", error);
        toast({
          title: "Errore",
          description: "Impossibile verificare l'acquisto",
          variant: "destructive",
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyPurchase();
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
              Stiamo verificando il tuo acquisto, attendere prego...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {success ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                Acquisto Completato!
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6 text-destructive" />
                Acquisto Non Completato
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <>
              <p className="text-muted-foreground">
                Grazie per il tuo acquisto! {creditsAdded} crediti sono stati aggiunti al tuo account.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/")}>
                  Torna alla Home
                </Button>
                <Button variant="outline" onClick={() => navigate("/credits")}>
                  Vedi i Tuoi Crediti
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Il pagamento non è stato completato o si è verificato un errore.
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

export default PurchaseSuccess;