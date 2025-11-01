import { Gift, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";

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
  const { t } = useTranslation();
  
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
              {t("banners.giftSubscription.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("banners.giftSubscription.description", { recipientNickname })}
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 w-full space-y-2 text-left text-sm">
            <p className="font-medium text-foreground">{t("banners.giftSubscription.whatIncludes")}</p>
            <ul className="space-y-1 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                {t("banners.giftSubscription.unlimitedCredits")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                {t("banners.giftSubscription.unlimitedLikes")}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                {t("banners.giftSubscription.premiumBadge")}
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("banners.giftSubscription.cancelAnytime")}
          </p>

          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {t("banners.giftSubscription.processing")}
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  {t("banners.giftSubscription.gift")}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
