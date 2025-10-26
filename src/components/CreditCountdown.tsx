import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CreditCountdownProps {
  creditsDepletedAt: string;
}

export const CreditCountdown = ({ creditsDepletedAt }: CreditCountdownProps) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTimeLeft = () => {
      const depletedTime = new Date(creditsDepletedAt);
      const nextResetTime = new Date(depletedTime.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = nextResetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(t("common.rechargeAvailable"));
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
  }, [creditsDepletedAt]);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
      <Clock className="h-4 w-4" />
      <span>Rinnovo giornaliero</span>
    </div>
  );
};
