import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import matchHeartIcon from "@/assets/match-heart.png";

interface MatchBannerProps {
  matchedUserName: string;
  onClose: () => void;
}

export const MatchBanner = ({ matchedUserName, onClose }: MatchBannerProps) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 100); // Fast fade out
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-100 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ pointerEvents: "none" }}
    >
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl max-w-md w-full animate-bounce-in"
        style={{
          background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #6366f1 100%)",
        }}
      >
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }}
        />

        <div className="relative p-8 text-center">
          {/* Hearts Animation */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <Heart
                key={i}
                className="absolute text-white animate-float-heart"
                style={{
                  left: `${Math.random() * 80 + 10}%`,
                  animationDelay: `${i * 0.3}s`,
                  opacity: 0.3,
                  fontSize: `${Math.random() * 20 + 15}px`,
                }}
                fill="white"
              />
            ))}
          </div>

          {/* Main Content */}
          <div className="relative z-10">
            <div className="mb-4 flex justify-center">
              <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm animate-pulse">
                <img src={matchHeartIcon} alt="Match" className="h-16 w-16" />
              </div>
            </div>

            <h2 className="text-4xl font-black text-white mb-2 drop-shadow-lg">
              MATCH!
            </h2>
            
            <p className="text-xl text-white font-semibold drop-shadow-md">
              {t("explore.match.description", { name: matchedUserName })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
