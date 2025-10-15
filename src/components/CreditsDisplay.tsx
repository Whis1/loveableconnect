import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { Coins, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const CreditsDisplay = () => {
  const { credits, loading } = useCredits();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
        <Coins className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">{t("dashboard.loading")}</span>
      </div>
    );
  }

  if (!credits) return null;

  if (credits.is_premium) {
    return (
      <Button
        variant="outline"
        onClick={() => navigate("/credits")}
        className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20 hover:bg-amber-500/20"
      >
        <Crown className="h-4 w-4 text-amber-500" />
        <span className="font-medium text-amber-600 dark:text-amber-400">Premium</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => navigate("/credits")}
      className="flex items-center gap-2"
    >
      <Coins className="h-4 w-4 text-primary" />
      <span className="font-medium">{credits.balance} {t("dashboard.credits")}</span>
    </Button>
  );
};