import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import matchSound from "@/assets/audio/match-sound.m4a";
interface MatchBannerProps {
  matchedUserName: string;
  matchedUserAvatar?: string | null;
  onClose: () => void;
}

export const MatchBanner = ({ matchedUserName, matchedUserAvatar, onClose }: MatchBannerProps) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  useEffect(() => {
    // Play match sound once on mount
    try {
      const audio = new Audio(matchSound);
      audio.volume = 1.0;
      void audio.play().catch((e) => {
        console.warn("Autoplay prevented, will play on user gesture.", e);
      });
    } catch (e) {
      console.warn("Error initializing match sound:", e);
    }
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ pointerEvents: "none" }}
    >
      <div
        className="relative overflow-hidden rounded-3xl shadow-2xl max-w-2xl w-full animate-bounce-in"
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

        <div className="relative p-12 text-center">
          {/* Hearts Animation */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <Heart
                key={i}
                className="absolute text-white animate-float-heart"
                style={{
                  left: `${Math.random() * 80 + 10}%`,
                  animationDelay: `${i * 0.2}s`,
                  opacity: 0.4,
                  fontSize: `${Math.random() * 30 + 20}px`,
                }}
                fill="white"
              />
            ))}
          </div>

          {/* Main Content */}
          <div className="relative z-10">
            <div className="mb-6 flex justify-center">
              <Avatar className="h-32 w-32 border-4 border-white shadow-2xl animate-scale-in">
                <AvatarImage src={matchedUserAvatar || undefined} alt={matchedUserName} />
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-4xl font-bold">
                  {getInitials(matchedUserName)}
                </AvatarFallback>
              </Avatar>
            </div>

            <h2 className="text-6xl font-black text-white mb-4 drop-shadow-lg">
              MATCH!
            </h2>
            
            <p className="text-2xl text-white font-semibold drop-shadow-md">
              {t("explore.match.description", { name: matchedUserName })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
