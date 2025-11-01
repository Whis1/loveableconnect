import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mic, X, Sparkles } from "lucide-react";

interface VoicePremiumBannerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const VoicePremiumBanner = ({ isVisible, onClose }: VoicePremiumBannerProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 15000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleSubscribe = () => {
    navigate("/credits");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-2xl shadow-2xl border-2 border-amber-300 animate-in zoom-in-95 duration-300">
        {/* Decorative elements */}
        <div className="absolute -top-2 -right-2 w-20 h-20 bg-yellow-300 rounded-full opacity-30 blur-xl" />
        <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-amber-300 rounded-full opacity-30 blur-xl" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <X className="h-4 w-4 text-amber-900" />
        </button>

        <div className="relative p-6 space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-white rounded-full blur-md opacity-60" />
              <div className="relative bg-gradient-to-br from-white to-amber-100 p-4 rounded-full shadow-lg">
                <Mic className="h-8 w-8 text-amber-600" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-white animate-pulse" />
            </div>
          </div>

          {/* Title and message */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-amber-900">
              Funzionalità PREMIUM
            </h3>
            <p className="text-sm text-amber-900/90 leading-relaxed">
              L'invio di messaggi vocali è una funzionalità riservata agli utenti PREMIUM. 
              Per accedere a questa funzione effettua l'Abbonamento PREMIUM mensile.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubscribe}
              className="flex-1 bg-gradient-to-r from-amber-900 to-amber-800 hover:from-amber-800 hover:to-amber-700 text-white shadow-lg border-0 font-semibold"
            >
              Abbonati ora
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 bg-white/80 hover:bg-white border-amber-900/20 text-amber-900 font-semibold"
            >
              Ignora
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
