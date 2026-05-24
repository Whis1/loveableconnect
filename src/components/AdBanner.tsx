import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ShoppingCart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import bannersData from "@/data/banners.json";

export const AdBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { credits, loading } = useCredits();
  const [isVisible, setIsVisible] = useState(false);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [shouldShowAds, setShouldShowAds] = useState(true);
  // Fallback iniziale dal JSON bundled: serve solo se la query DB fallisce
  // (es. tabella non ancora migrata). Una volta arrivata la risposta DB
  // setBanners viene rimpiazzato con la lista reale.
  const [banners, setBanners] = useState<string[]>(bannersData.banners);

  // Carica i banner dal DB (tabella app_banners, SELECT pubblica via RLS).
  // Prima leggevamo da localStorage scritto dall'admin → ogni browser aveva
  // una lista diversa, le modifiche dell'admin non arrivavano agli utenti.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("app_banners")
          .select("image_path, position")
          .order("position", { ascending: true });
        if (cancelled) return;
        if (error) {
          console.warn("AdBanner: errore lettura app_banners, uso fallback JSON", error);
          return;
        }
        const paths = (data ?? [])
          .map((r: any) => r?.image_path)
          .filter((p: any): p is string => typeof p === 'string' && p.length > 0);
        if (paths.length > 0) {
          setBanners(paths);
        }
      } catch (e) {
        console.warn("AdBanner: eccezione fetch banner, uso fallback JSON", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Check if user has premium subscription (monthly or weekly)
  useEffect(() => {
    if (!loading && credits) {
      const isPremium = credits.is_premium &&
        (!credits.premium_expires_at || new Date(credits.premium_expires_at) > new Date());
      const subscriptionType = credits.subscription_type;
      
      // Disable ads for monthly and weekly premium users
      const hasAdFreeSubscription = isPremium && (subscriptionType === 'monthly' || subscriptionType === 'weekly');
      setShouldShowAds(!hasAdFreeSubscription);
    }
  }, [credits, loading]);

  // Timer to show banner every 3 minutes
  useEffect(() => {
    if (!shouldShowAds || banners.length === 0) return;

    const showBannerInterval = setInterval(() => {
      setIsVisible(true);
      
      // Auto-hide after 14 seconds
      setTimeout(() => {
        setIsVisible(false);
        // Move to next banner
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      }, 14000);
    }, 180000); // 3 minutes = 180000ms

    // Show first banner after 3 minutes
    return () => clearInterval(showBannerInterval);
  }, [shouldShowAds, banners]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handlePurchase = () => {
    navigate("/credits");
    setIsVisible(false);
  };

  // Pagine in cui i banner promozionali NON devono mai apparire (login, area
  // admin, pagine legali, ecc.). Per aggiungere/rimuovere pagine basta
  // modificare le due liste qui sotto.
  const HIDE_AD_EXACT_PATHS = [
    '/auth',
    '/terms',
    '/chattors-login',
    '/chattors',
    '/adminarrettu',
  ];
  const HIDE_AD_PATH_PREFIXES = ['/admin/', '/chattors/'];

  const isHiddenPage =
    HIDE_AD_EXACT_PATHS.includes(location.pathname) ||
    HIDE_AD_PATH_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));

  if (isHiddenPage || !shouldShowAds || !isVisible || banners.length === 0) {
    return null;
  }

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
