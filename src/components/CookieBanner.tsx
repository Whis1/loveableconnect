import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Cookie } from "lucide-react";

interface CookieBannerProps {
  onConsent: () => void;
}

export const CookieBanner = ({ onConsent }: CookieBannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleConsent = () => {
    if (!agreedToTerms) {
      return; // Non permettere di procedere senza accettare i termini
    }
    localStorage.setItem("cookieConsent", "accepted");
    onConsent();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-white via-pink-50/30 to-purple-50/30 dark:from-gray-900 dark:via-pink-950/20 dark:to-purple-950/20 border-2 border-pink-200 dark:border-pink-800 shadow-2xl animate-slide-in-bottom">
        <div className="p-6 space-y-4">
          {/* Header con icona */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl shadow-lg">
              <Cookie className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Consenso Cookie
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Utilizziamo cookie tecnici necessari per il funzionamento del sito e cookie analitici per migliorare la tua esperienza. 
                Per continuare, è necessario accettare i nostri{" "}
                <a 
                  href="/terms" 
                  target="_blank"
                  className="text-primary hover:underline font-semibold"
                >
                  Termini di Servizio e Privacy Policy
                </a>.
              </p>
            </div>
          </div>

          {/* Collapsible per checkbox termini */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-accent/50 transition-colors group">
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              <span className="text-sm font-medium group-hover:text-primary">
                Dichiarazione di accettazione (richiesta)
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 px-3 pb-1">
              <div className="flex items-start gap-3 p-4 bg-accent/30 rounded-lg border border-border">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                  className="mt-1"
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-relaxed cursor-pointer flex-1"
                >
                  Dichiaro di aver letto e accettato i{" "}
                  <a 
                    href="/terms" 
                    target="_blank"
                    className="text-primary hover:underline font-semibold"
                  >
                    Termini di Servizio
                  </a>{" "}
                  e l'{" "}
                  <a 
                    href="/terms" 
                    target="_blank"
                    className="text-primary hover:underline font-semibold"
                  >
                    Informativa sulla Privacy
                  </a>.
                </label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Pulsante Consenti */}
          <Button
            onClick={handleConsent}
            disabled={!agreedToTerms}
            className="w-full h-12 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg font-semibold text-base"
          >
            {agreedToTerms ? "✓ Consenti e Continua" : "Accetta i termini per continuare"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Il consenso verrà salvato e questo banner non apparirà più
          </p>
        </div>
      </Card>
    </div>
  );
};
