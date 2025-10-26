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
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 backdrop-blur-lg shadow-xl">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 animate-pulse" />
        
        <div className="relative p-6">
          <button
            onClick={() => setShowBanner(false)}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-3 rounded-full bg-gradient-to-br from-primary to-accent">
              <Bell className="h-6 w-6 text-white" />
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-1">
                  🔔 Attiva le Notifiche Push
                </h3>
                <p className="text-sm text-muted-foreground">
                  Non perderti mai più un messaggio, like o match! Ricevi notifiche istantanee anche quando il browser è chiuso.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={subscribe}
                  disabled={isLoading}
                  className="relative overflow-hidden group bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <span className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Bell className="h-4 w-4 mr-2" />
                  <span className="relative font-semibold">
                    {isLoading ? 'Attivazione...' : 'Attiva Notifiche'}
                  </span>
                </Button>

                <Button
                  onClick={() => setShowBanner(false)}
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <BellOff className="h-4 w-4 mr-2" />
                  Non ora
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Funziona su desktop e mobile
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};