import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Coins, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface InsufficientCreditsBannerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const InsufficientCreditsBanner = ({ isVisible, onClose }: InsufficientCreditsBannerProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const handleNavigate = () => {
    navigate("/credits");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <Card className="relative max-w-md w-full p-8 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-800 dark:via-purple-900/50 dark:to-indigo-900/50 border-2 border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/10 rounded-full blur-2xl animate-pulse delay-75" />
        
        <div className="relative space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-gradient-to-br from-primary to-accent p-4 rounded-full">
                <Coins className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-in slide-in-from-top-2 duration-500">
              {t("chat.creditsInsufficient")}
            </h3>
            <p className="text-muted-foreground text-sm">
              {t("chat.creditsInsuffficientDescription")}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleNavigate}
              size="lg"
              className="flex-1 relative overflow-hidden group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <span className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Coins className="h-5 w-5 mr-2" />
              <span className="relative font-semibold">
                Ricarica
              </span>
            </Button>
            <Button
              onClick={handleNavigate}
              size="lg"
              className="flex-1 relative overflow-hidden group bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <span className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Sparkles className="h-5 w-5 mr-2 animate-pulse" />
              <span className="relative font-semibold">
                Abbonati
              </span>
            </Button>
          </div>

          {/* Close hint */}
          <p className="text-xs text-center text-muted-foreground/60">
            {t("common.autoCloseIn10Seconds")}
          </p>
        </div>
      </Card>
    </div>
  );
};
