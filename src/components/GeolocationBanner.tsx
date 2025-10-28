import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, X } from "lucide-react";

interface GeolocationBannerProps {
  onActivate: () => void;
  onClose: () => void;
}

export const GeolocationBanner = ({ onActivate, onClose }: GeolocationBannerProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-md w-full bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/50 dark:from-gray-900 dark:via-emerald-950/30 dark:to-teal-950/30 border-2 border-emerald-200 dark:border-emerald-800 shadow-2xl animate-scale-in">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg flex-shrink-0">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  📍 Geolocalizzazione Richiesta
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Per localizzare gli utenti nelle tue vicinanze è necessario attivare la Geolocalizzazione.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 -mt-1 -mr-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={onActivate}
            className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg font-semibold"
          >
            ✓ Attiva Geolocalizzazione
          </Button>
        </div>
      </Card>
    </div>
  );
};
