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
}

export const DailyLikesDisplay = ({ likesRemaining, isPremium, resetAt, loading, subscriptionType }: DailyLikesDisplayProps) => {
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

  // Solo il monthly premium ha like illimitati
  const isMonthlyPremium = isPremium && subscriptionType === 'monthly';
  
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
  
  // Weekly premium mostra 30 like max, free mostra 8 like max
  const isWeeklyPremium = isPremium && subscriptionType === 'weekly';
  const maxLikes = isWeeklyPremium ? 30 : 8;

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        onClick={() => navigate("/credits")}
        className={`flex items-center gap-2 ${
          isWeeklyPremium ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:bg-purple-500/20' : ''
        }`}
      >
        {isWeeklyPremium && <Crown className="h-4 w-4 text-purple-500" />}
        <Heart className={`h-4 w-4 ${isWeeklyPremium ? 'text-purple-500' : 'text-primary'}`} />
        <span className={`font-medium ${isWeeklyPremium ? 'text-purple-600 dark:text-purple-400' : ''}`}>
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
