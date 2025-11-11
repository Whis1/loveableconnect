import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ShoppingCart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import bannersData from "@/data/banners.json";

export const AdBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { credits, loading } = useCredits();
  const [isVisible, setIsVisible] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [shouldShowAds, setShouldShowAds] = useState(true);
  const [banners, setBanners] = useState<string[]>(bannersData.banners);

  // Hide ads on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  // Load banners from localStorage if available
  useEffect(() => {
    const savedBanners = localStorage.getItem('adBanners');
    if (savedBanners) {
      try {
        const parsed = JSON.parse(savedBanners);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBanners(parsed);
        }
      } catch (e) {
        console.error('Error parsing saved banners:', e);
      }
    }
  }, []);

  // Check if user has premium subscription (monthly or weekly)
  useEffect(() => {
    if (!loading && credits) {
      const isPremium = credits.is_premium;
      const subscriptionType = credits.subscription_type;
      
      // Disable ads for monthly and weekly premium users
      const hasAdFreeSubscription = isPremium && (subscriptionType === 'monthly' || subscriptionType === 'weekly');
      setShouldShowAds(!hasAdFreeSubscription);
    }
  }, [credits, loading]);

  // Timer to show banner every 6 minutes
  useEffect(() => {
    if (!shouldShowAds || banners.length === 0) return;

    const showBannerInterval = setInterval(() => {
      setIsVisible(true);
      
      // Auto-hide after 8 seconds
      setTimeout(() => {
        setIsVisible(false);
        // Move to next banner
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      }, 8000);
    }, 360000); // 6 minutes = 360000ms

    // Show first banner after 6 minutes
    return () => clearInterval(showBannerInterval);
  }, [shouldShowAds, banners]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handlePurchase = () => {
    navigate("/credits");
    setIsVisible(false);
  };

  if (!shouldShowAds || !isVisible || banners.length === 0) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={handleClose}
    >
      <div 
        className="relative max-w-2xl w-full mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner Image */}
        <div className="relative rounded-lg overflow-hidden shadow-2xl">
          <img 
            src={banners[currentBannerIndex]} 
            alt="Banner pubblicitario" 
            className="w-full h-auto"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4 justify-center">
          <Button
            onClick={handlePurchase}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 text-lg font-semibold"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Acquista
          </Button>
          <Button
            onClick={handleClose}
            variant="outline"
            className="px-6 py-3 text-lg font-semibold"
          >
            <X className="h-5 w-5 mr-2" />
            Leva
          </Button>
        </div>
      </div>
    </div>
  );
};
