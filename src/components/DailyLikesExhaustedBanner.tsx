import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, Heart } from "lucide-react";

interface DailyLikesExhaustedBannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseCredits: () => void;
  resetAt: string | null;
  hasEnoughCredits: boolean;
}

export const DailyLikesExhaustedBanner = ({ 
  open, 
  onOpenChange, 
  onUseCredits,
  resetAt,
  hasEnoughCredits 
}: DailyLikesExhaustedBannerProps) => {
  const formatTimeRemaining = () => {
    if (!resetAt) return "24 ore";
    const now = new Date();
    const reset = new Date(resetAt);
    const diff = reset.getTime() - now.getTime();
    
    if (diff <= 0) return "a breve";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Heart className="h-16 w-16 text-primary/20" />
              <Clock className="h-8 w-8 text-primary absolute bottom-0 right-0" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl">
            8 Like Giornalieri Terminati
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3">
            <p className="text-base">
              Hai esaurito i tuoi 8 like giornalieri!
            </p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm">
                <strong>Prossimo aggiornamento:</strong> {formatTimeRemaining()}
              </p>
              {hasEnoughCredits && (
                <p className="text-sm text-primary">
                  Oppure usa <strong>2 crediti</strong> per mettere like subito
                </p>
              )}
            </div>
            {!hasEnoughCredits && (
              <p className="text-sm text-destructive">
                Non hai abbastanza crediti. Acquistane di più o attendi il reset giornaliero.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="m-0">Aspetta Reset</AlertDialogCancel>
          {hasEnoughCredits && (
            <AlertDialogAction onClick={onUseCredits} className="m-0">
              Usa 2 Crediti
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
