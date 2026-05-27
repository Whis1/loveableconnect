import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Clock, Heart, Loader2 } from "lucide-react";

interface DailyLikesExhaustedBannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseCredits: () => void;
  resetAt: string | null;
  /** 🔒 Quando true, il pulsante "Usa 2 Crediti" è disabilitato (spinner).
   *  Previene il classico spam-click che faceva partire multiple RPC parallele. */
  isProcessing?: boolean;
}

export const DailyLikesExhaustedBanner = ({
  open,
  onOpenChange,
  onUseCredits,
  resetAt,
  isProcessing = false,
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
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <Heart className="h-20 w-20 text-primary/20" />
              <Clock className="h-10 w-10 text-primary absolute bottom-0 right-0" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-2xl font-semibold">
            Like Giornalieri Terminati
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-4 pt-2">
            <div className="text-base text-foreground">
              Hai esaurito i tuoi like giornalieri!
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="text-sm">
                <strong>Attendi il rinnovo:</strong> {formatTimeRemaining()}
              </div>
              <div className="text-sm text-primary font-medium">
                Oppure usa <strong>2 crediti</strong> per mettere like subito
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-3 sm:gap-3 mt-2">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <AlertDialogCancel className="flex-1 m-0" disabled={isProcessing}>
              Attendi Rinnovo
            </AlertDialogCancel>
            {/* 🔒 Bottone CUSTOM (non AlertDialogAction) per evitare l'auto-close
                del dialog: vogliamo restare aperti finché la RPC non torna,
                così l'utente vede chiaramente lo spinner e NON può spammare
                aprendo/chiudendo il banner. */}
            <Button
              onClick={onUseCredits}
              disabled={isProcessing}
              className="flex-1 m-0"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invio...
                </>
              ) : (
                "Usa 2 Crediti"
              )}
            </Button>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
