import { Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface GiftSubscriptionBannerProps {
  recipientNickname: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const GiftSubscriptionBanner = ({
  recipientNickname,
  onConfirm,
  onCancel,
  isProcessing = false,
}: GiftSubscriptionBannerProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <Card className="relative w-full max-w-md mx-4 p-6 shadow-2xl border-2 border-primary/20">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={onCancel}
          disabled={isProcessing}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Gift className="h-8 w-8 text-white" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">
              Regala Premium
            </h3>
            <p className="text-sm text-muted-foreground">
              Regala l'abbonamento mensile a{" "}
              <span className="font-semibold text-primary">
                {recipientNickname}
              </span>{" "}
              per{" "}
              <span className="font-bold text-foreground">399,99 euro al mese</span>
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Potrai disdire il rinnovo automatico in qualsiasi momento
          </p>

          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Elaborazione...
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Regala
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
