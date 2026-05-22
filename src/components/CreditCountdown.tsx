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

      setTimeLeft(`${hours}h ${minutes}m`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [creditsDepletedAt]);

  return (
    // Stesse dimensioni e colore del "Rinnovo giornaliero" sotto i Like
    // (text-xs + h-3/w-3 + text-muted-foreground), cosi' i due contatori
    // hanno la stessa estetica.
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{t("dashboard.dailyRenewal")} {timeLeft}</span>
    </div>
  );
};
