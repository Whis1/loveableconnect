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
  subscription_type?: string;
  premium_tier?: string;
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

  const isMonthlyPremium = isPremiumValid && credits.subscription_type === 'monthly' && (!credits.premium_tier || credits.premium_tier === 'premium');
  const isMonthlyStandard = isPremiumValid && credits.subscription_type === 'monthly' && credits.premium_tier === 'standard';

  // Solo il mensile premium (tier premium) mostra il badge senza crediti
  if (isMonthlyPremium) {
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

  const isWeeklyPremium = isPremiumValid && credits.subscription_type === 'weekly';
  
  // Determina il target balance in base al tipo di abbonamento
  const targetBalance = isMonthlyStandard ? 70 : isWeeklyPremium ? 40 : 16;
  
  const showCountdown = 
    credits.balance < targetBalance && 
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
        subscriptionType={credits.subscription_type}
        premiumTier={credits.premium_tier}
      />
      
      {/* Credits Display */}
      {/* items-start: il bottone "X Crediti" prende solo la larghezza che gli
          serve, identico al bottone Like. */}
      <div className="flex flex-col items-start gap-1">
        <Button
          variant="outline"
          onClick={() => navigate("/credits")}
          className={`flex items-center gap-2 w-fit ${
            isMonthlyStandard ? 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:bg-blue-500/20' :
            isWeeklyPremium ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:bg-purple-500/20' : ''
          }`}
        >
          {isMonthlyStandard && <Crown className="h-4 w-4 text-blue-500" />}
          {isWeeklyPremium && <Crown className="h-4 w-4 text-purple-500" />}
          <Coins className={`h-4 w-4 ${isMonthlyStandard ? 'text-blue-500' : isWeeklyPremium ? 'text-purple-500' : 'text-primary'}`} />
          <span className={`font-medium ${isMonthlyStandard ? 'text-blue-600 dark:text-blue-400' : isWeeklyPremium ? 'text-purple-600 dark:text-purple-400' : ''}`}>
            {credits.balance} {t("dashboard.credits")}
          </span>
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