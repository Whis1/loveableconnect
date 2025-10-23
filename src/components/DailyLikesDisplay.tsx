import { Heart, Crown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DailyLikesDisplayProps {
  likesRemaining: number;
  isPremium: boolean;
  resetAt: string | null;
  loading: boolean;
}

export const DailyLikesDisplay = ({ likesRemaining, isPremium, resetAt, loading }: DailyLikesDisplayProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
        <Heart className="h-4 w-4 text-muted-foreground animate-pulse" />
        <span className="text-sm text-muted-foreground">...</span>
      </div>
    );
  }

  if (isPremium) {
    return (
      <Button
        variant="outline"
        onClick={() => navigate("/credits")}
        className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20 hover:bg-amber-500/20"
      >
        <Crown className="h-4 w-4 text-amber-500" />
        <Heart className="h-4 w-4 text-amber-500" />
        <span className="font-medium text-amber-600 dark:text-amber-400">Like Illimitati</span>
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

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        onClick={() => navigate("/credits")}
        className="flex items-center gap-2"
      >
        <Heart className="h-4 w-4 text-primary" />
        <span className="font-medium">{likesRemaining}/13 Like</span>
      </Button>
      {timeRemaining && likesRemaining < 13 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
          <Clock className="h-3 w-3" />
          <span>Reset: {timeRemaining}</span>
        </div>
      )}
    </div>
  );
};
