import { useCredits } from "@/hooks/useCredits";
import { useDailyLikes } from "@/hooks/useDailyLikes";
import { Button } from "@/components/ui/button";
import { Coins, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CreditCountdown } from "@/components/CreditCountdown";
import { DailyLikesDisplay } from "@/components/DailyLikesDisplay";

interface UserCredits {
  balance: number;
  is_premium: boolean;
  last_daily_reset: string;
  premium_expires_at?: string | null;
  credits_depleted_at?: string | null;
}

export const CreditsDisplay = () => {
  const { credits, loading } = useCredits();
  const dailyLikes = useDailyLikes();
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

  // Check if premium is still valid
  const isPremiumValid = credits.is_premium && 
    (!credits.premium_expires_at || new Date(credits.premium_expires_at) > new Date());

  if (isPremiumValid) {
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

  const showCountdown = 
    credits.balance < 40 && 
    credits.credits_depleted_at !== null && 
    credits.credits_depleted_at !== undefined;

  return (
    <div className="flex flex-col lg:flex-row gap-2">
      {/* Daily Likes Display */}
      <DailyLikesDisplay
        likesRemaining={dailyLikes.likesRemaining}
        isPremium={dailyLikes.isPremium}
        resetAt={dailyLikes.resetAt}
        loading={dailyLikes.loading}
      />
      
      {/* Credits Display */}
      <div className="flex flex-col gap-1">
        <Button
          variant="outline"
          onClick={() => navigate("/credits")}
          className="flex items-center gap-2"
        >
          <Coins className="h-4 w-4 text-primary" />
          <span className="font-medium">{credits.balance} {t("dashboard.credits")}</span>
        </Button>
        {showCountdown && (
          <div className="text-xs px-2">
            <CreditCountdown creditsDepletedAt={credits.credits_depleted_at!} />
          </div>
        )}
      </div>
    </div>
  );
};