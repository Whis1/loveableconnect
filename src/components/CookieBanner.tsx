import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

export const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem("cookieConsent");
    if (!cookieConsent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "accepted");
    setShowBanner(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookieConsent", "rejected");
    setShowBanner(false);
  };

  const handleClose = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-in-bottom">
      <Card className="max-w-4xl mx-auto relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-2 border-primary/20 shadow-2xl">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="p-6 pr-12">
          <h3 className="text-lg font-bold mb-2">🍪 Utilizzo dei Cookie</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Utilizziamo cookie tecnici necessari per il funzionamento del sito e cookie analitici per migliorare la tua esperienza. 
            Accettando, acconsenti all'uso di tutti i cookie. Puoi rifiutare i cookie non essenziali.{" "}
            <button
              onClick={() => navigate("/terms")}
              className="text-primary hover:underline font-medium"
            >
              Leggi la Cookie Policy
            </button>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleAccept}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              Accetta tutti
            </Button>
            <Button
              onClick={handleReject}
              variant="outline"
              className="flex-1"
            >
              Rifiuta non essenziali
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
