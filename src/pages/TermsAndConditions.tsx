import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";

const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-center">
              Informazioni Legali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="privacy" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="privacy">Privacy</TabsTrigger>
                <TabsTrigger value="terms">Termini e Condizioni</TabsTrigger>
                <TabsTrigger value="cookies">Cookie</TabsTrigger>
              </TabsList>

              <TabsContent value="privacy" className="space-y-4 mt-6">
                <h2 className="text-xl font-semibold">Informativa sulla Privacy</h2>
                <p className="text-muted-foreground">
                  Contenuto dell'informativa sulla privacy sarà inserito qui.
                </p>
              </TabsContent>

              <TabsContent value="terms" className="space-y-4 mt-6">
                <h2 className="text-xl font-semibold">Termini e Condizioni di Servizio</h2>
                <p className="text-muted-foreground">
                  Contenuto dei termini e condizioni di servizio sarà inserito qui.
                </p>
              </TabsContent>

              <TabsContent value="cookies" className="space-y-4 mt-6">
                <h2 className="text-xl font-semibold">Politica sui Cookie</h2>
                <p className="text-muted-foreground">
                  Contenuto della politica sui cookie sarà inserito qui.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsAndConditions;
