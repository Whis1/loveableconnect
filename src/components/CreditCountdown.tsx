import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CreditCountdownProps {
  lastDailyReset: string;
}

export const CreditCountdown = ({ lastDailyReset }: CreditCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const resetTime = new Date(lastDailyReset);
      const nextResetTime = new Date(resetTime.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = nextResetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Ricarica disponibile!");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [lastDailyReset]);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
      <Clock className="h-4 w-4" />
      <span>Prossima ricarica: {timeLeft}</span>
    </div>
  );
};
