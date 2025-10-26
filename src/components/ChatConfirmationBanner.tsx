import { Button } from "@/components/ui/button";
import { X, MessageCircle, Coins } from "lucide-react";

interface ChatConfirmationBannerProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  isLoading?: boolean;
}

export const ChatConfirmationBanner = ({
  isVisible,
  onClose,
  onConfirm,
  userName,
  isLoading = false
}: ChatConfirmationBannerProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          disabled={isLoading}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              Inizia una Chat
            </h3>
            <p className="text-muted-foreground">
              Usa <span className="font-bold text-primary">6 crediti</span> per scrivere direttamente a{" "}
              <span className="font-semibold text-foreground">{userName}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
            <Coins className="h-5 w-5" />
            <span className="font-semibold">6 crediti</span>
          </div>

          <div className="flex gap-3 w-full pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Caricamento...' : 'Conferma'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
