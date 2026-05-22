import { Heart, Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface DailyLikesDisplayProps {
  likesRemaining: number;
  isPremium: boolean;
  resetAt: string | null;
  loading: boolean;
  subscriptionType?: string;
  premiumTier?: string;
}

export const DailyLikesDisplay = ({ likesRemaining, isPremium, resetAt, loading, subscriptionType, premiumTier }: DailyLikesDisplayProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
        <Heart className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">...</span>
      </div>
    );
  }

  // Solo il monthly premium con tier premium ha like illimitati
  const isMonthlyPremium = isPremium && subscriptionType === 'monthly' && (!premiumTier || premiumTier === 'premium');
  
  if (isMonthlyPremium) {
    return (
      <Button
        variant="outline"
        onClick={() => navigate("/credits")}
        className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20 hover:bg-amber-500/20"
      >
        <Crown className="h-4 w-4 text-amber-500" />
        <Heart className="h-4 w-4 text-amber-500" />
        <span className="font-medium text-amber-600 dark:text-amber-400">{t("dashboard.unlimitedLikes")}</span>
      </Button>
    );
  }

  const formatTimeRemaining = () => {
    if (!resetAt) return null;
    const now = new Date();
    const reset = new Date(resetAt);
    const diff = reset.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const timeRemaining = formatTimeRemaining();
  
  // Monthly standard (platino) = 40 like max, Weekly premium = 30 like max, free = 8 like max
  const isMonthlyStandard = isPremium && subscriptionType === 'monthly' && premiumTier === 'standard';
  const isWeeklyPremium = isPremium && subscriptionType === 'weekly';
  const maxLikes = isMonthlyStandard ? 40 : isWeeklyPremium ? 30 : 8;

  return (
    // items-start: il bottone "1/8 Like" prende solo la larghezza che gli
    // serve, niente piu' pillola lunga inutile.
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
        <Heart className={`h-4 w-4 ${isMonthlyStandard ? 'text-blue-500' : isWeeklyPremium ? 'text-purple-500' : 'text-primary'}`} />
        <span className={`font-medium ${isMonthlyStandard ? 'text-blue-600 dark:text-blue-400' : isWeeklyPremium ? 'text-purple-600 dark:text-purple-400' : ''}`}>
          {Math.max(0, likesRemaining)}/{maxLikes} Like
        </span>
      </Button>
      {timeRemaining && likesRemaining < maxLikes && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
          <Clock className="h-3 w-3" />
          <span>{t("dashboard.dailyRenewal")} {timeRemaining}</span>
        </div>
      )}
    </div>
  );
};
