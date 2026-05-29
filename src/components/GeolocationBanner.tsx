import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, X, Cookie, Shield } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface GeolocationBannerProps {
  onActivate: () => void;
  onClose: () => void;
}

export const GeolocationBanner = ({ onActivate, onClose }: GeolocationBannerProps) => {
  const [cookieConsent, setCookieConsent] = useState(false);
  const [showConsentStep, setShowConsentStep] = useState(false);

  const handleInitialActivate = () => {
    // ⚡ Passa SUBITO allo step di consenso: niente attesa del "fix" GPS
    //    (getCurrentPosition può impiegare secondi per acquisire la posizione,
    //    rendendo il click lento). Il prompt del browser lo inneschiamo in
    //    background senza bloccare la UI.
    setShowConsentStep(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {},
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
      );
    }
  };

  const handleConsentChange = (checked: boolean) => {
    setCookieConsent(checked);
  };

  const handleFinalActivate = () => {
    if (!cookieConsent) {
      return;
    }
    
    // Save cookie consent (geolocation already granted at browser level)
    localStorage.setItem("geolocationEnabled", "true");
    localStorage.setItem("geolocationCookieConsent", "accepted");
    onActivate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-lg w-full bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/50 dark:from-gray-900 dark:via-emerald-950/30 dark:to-teal-950/30 border-2 border-emerald-200 dark:border-emerald-800 shadow-2xl animate-scale-in">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg flex-shrink-0">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  📍 Geolocalizzazione Richiesta
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Per scoprire persone nelle tue vicinanze, abbiamo bisogno di accedere alla tua posizione.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 -mt-1 -mr-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!showConsentStep ? (
            <>
              <div className="space-y-3 mb-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-emerald-200 dark:border-emerald-700">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Cosa faremo con la tua posizione?</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Mostrare profili vicini a te</li>
                      <li>• Calcolare la distanza tra te e gli altri utenti</li>
                      <li>• Migliorare i suggerimenti di match</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleInitialActivate}
                className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg font-semibold transition-all duration-300 transform hover:scale-[1.02]"
              >
                Continua
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3 mb-4">
                    <Cookie className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-2 text-amber-900 dark:text-amber-100">
                        🍪 Consenso Cookie Necessario
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                        Per memorizzare le tue preferenze di geolocalizzazione e offrirti un'esperienza migliore, 
                        utilizziamo cookie tecnici essenziali. Questi dati vengono salvati solo sul tuo dispositivo 
                        e non vengono condivisi con terze parti.{" "}
                        <a 
                          href="/terms" 
                          target="_blank"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                        >
                          Leggi l'informativa
                        </a>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-amber-200 dark:border-amber-800">
                    <label
                      htmlFor="cookie-consent"
                      className="text-sm font-medium cursor-pointer text-amber-900 dark:text-amber-100 flex items-center gap-2"
                    >
                      Consenti →
                    </label>
                    <Checkbox
                      id="cookie-consent"
                      checked={cookieConsent}
                      onCheckedChange={handleConsentChange}
                      className="h-5 w-5"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowConsentStep(false)}
                  variant="outline"
                  className="flex-1 h-11 border-2 border-gray-300 dark:border-gray-600"
                >
                  ← Indietro
                </Button>
                <Button
                  onClick={handleFinalActivate}
                  disabled={!cookieConsent}
                  className="flex-1 h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  ✓ Attiva Geolocalizzazione
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
