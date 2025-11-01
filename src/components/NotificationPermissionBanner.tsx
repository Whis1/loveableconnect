import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const NotificationPermissionBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const { permission, isSupported, isSubscribed, isLoading, subscribe } = usePushNotifications();

  useEffect(() => {
    // Show banner if notifications are supported, not subscribed, and permission not denied
    const shouldShow = isSupported && !isSubscribed && permission === 'default';
    setShowBanner(shouldShow);
  }, [isSupported, isSubscribed, permission]);

  if (!showBanner) return null;

  return (
    <div className="fixed top-20 left-0 right-0 z-50 mx-4 md:mx-auto md:max-w-2xl animate-in slide-in-from-top duration-300">
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-white dark:bg-gray-900 shadow-2xl">
        {/* Strong gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 dark:from-pink-950/50 dark:via-purple-950/50 dark:to-indigo-950/50" />
        
        {/* Animated glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 animate-pulse" />
        
        <div className="relative p-6">
          <button
            onClick={() => setShowBanner(false)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-4 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Bell className="h-7 w-7 text-white" />
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">
                  🔔 Attiva le Notifiche Push
                </h3>
                <p className="text-base text-gray-700 dark:text-gray-200 leading-relaxed">
                  Non perderti mai più un messaggio, like o match! Ricevi notifiche istantanee anche quando il browser è chiuso.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={subscribe}
                  disabled={isLoading}
                  size="lg"
                  className="relative overflow-hidden group bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <span className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Bell className="h-5 w-5 mr-2" />
                  <span className="relative">
                    {isLoading ? 'Attivazione...' : 'Attiva Notifiche'}
                  </span>
                </Button>

                <Button
                  onClick={() => setShowBanner(false)}
                  variant="outline"
                  size="lg"
                  className="font-semibold border-2 bg-white/50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800"
                >
                  <BellOff className="h-5 w-5 mr-2" />
                  Non ora
                </Button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};