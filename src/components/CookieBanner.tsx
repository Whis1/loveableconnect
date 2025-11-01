import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie } from "lucide-react";

interface CookieBannerProps {
  onConsent: () => void;
}

export const CookieBanner = ({ onConsent }: CookieBannerProps) => {
  const { t } = useTranslation();

  const handleConsent = () => {
    localStorage.setItem("cookieConsent", "accepted");
    onConsent();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end justify-center p-4 animate-fade-in">
      <Card className="max-w-3xl w-full bg-gradient-to-br from-white via-pink-50/50 to-purple-50/50 dark:from-gray-900 dark:via-pink-950/30 dark:to-purple-950/30 border-2 border-pink-200 dark:border-pink-800 shadow-2xl animate-slide-in-bottom">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl shadow-lg flex-shrink-0">
              <Cookie className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                🍪 {t('cookies.title')}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('cookies.description')}{" "}
                <a 
                  href="/terms" 
                  target="_blank"
                  className="text-primary hover:underline font-semibold"
                >
                  {t('cookies.readPolicy')}
                </a>.
              </p>
            </div>
          </div>

          <Button
            onClick={handleConsent}
            className="w-full h-11 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-lg font-semibold"
          >
            ✓ {t('cookies.acceptButton')}
          </Button>
        </div>
      </Card>
    </div>
  );
};
