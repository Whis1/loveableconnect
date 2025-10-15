import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Cookie } from "lucide-react";
import { Link } from "react-router-dom";

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Small delay for animation
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const handleConsent = (accepted: boolean) => {
    if (accepted && !termsAccepted && isExpanded) {
      return; // Don't allow consent without accepting terms when expanded
    }

    localStorage.setItem("cookieConsent", accepted ? "accepted" : "rejected");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 animate-slide-in-bottom">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <div className="bg-white/20 rounded-full p-3">
                  <Cookie className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl md:text-2xl font-bold text-white">
                    🍪 Cookie e Privacy
                  </h3>
                  <p className="text-white/90 text-sm md:text-base leading-relaxed">
                    Utilizziamo cookie per migliorare la tua esperienza, personalizzare i contenuti 
                    e analizzare il traffico del sito. Proseguendo accetti l'uso dei cookie.
                  </p>
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link 
                    to="/terms" 
                    className="text-white hover:text-white/80 underline underline-offset-4 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <span className="text-white/60">•</span>
                  <Link 
                    to="/terms" 
                    className="text-white hover:text-white/80 underline underline-offset-4 transition-colors"
                  >
                    Termini e Condizioni
                  </Link>
                  <span className="text-white/60">•</span>
                  <Link 
                    to="/terms" 
                    className="text-white hover:text-white/80 underline underline-offset-4 transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </div>

                {/* Expandable Section */}
                <div className="border-t border-white/20 pt-4">
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center justify-between w-full text-left group"
                  >
                    <span className="text-white font-medium text-sm md:text-base flex items-center gap-2">
                      <span>Dettagli e Consenso</span>
                      {isExpanded && termsAccepted && (
                        <span className="text-green-300 text-xs">✓</span>
                      )}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-white group-hover:translate-y-[-2px] transition-transform" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white group-hover:translate-y-[2px] transition-transform" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 space-y-4 animate-fade-in">
                      <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="terms"
                            checked={termsAccepted}
                            onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                            className="mt-1 border-white data-[state=checked]:bg-white data-[state=checked]:text-pink-600"
                          />
                          <label
                            htmlFor="terms"
                            className="text-sm text-white/90 leading-relaxed cursor-pointer"
                          >
                            Dichiaro di aver letto e accettato i{" "}
                            <Link 
                              to="/terms" 
                              className="underline underline-offset-2 hover:text-white transition-colors font-medium"
                            >
                              Termini di Servizio
                            </Link>
                            {" "}e l'{" "}
                            <Link 
                              to="/terms" 
                              className="underline underline-offset-2 hover:text-white transition-colors font-medium"
                            >
                              Informativa sulla Privacy
                            </Link>
                            .
                          </label>
                        </div>
                      </div>

                      {isExpanded && !termsAccepted && (
                        <p className="text-xs text-pink-200 animate-fade-in">
                          ⚠️ Devi accettare i termini per poter continuare
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={() => handleConsent(true)}
                    disabled={isExpanded && !termsAccepted}
                    className="flex-1 bg-white text-pink-600 hover:bg-white/90 font-semibold text-base py-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✓ Consenti
                  </Button>
                  <Button
                    onClick={() => handleConsent(false)}
                    variant="outline"
                    className="flex-1 border-2 border-white text-white hover:bg-white/10 font-semibold text-base py-6 rounded-xl transition-all"
                  >
                    Rifiuta
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
