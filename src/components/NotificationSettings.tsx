import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Smartphone, Monitor, Check, X } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const NotificationSettings = () => {
  const { permission, isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { text: 'Consentite', icon: Check, color: 'text-green-500' };
      case 'denied':
        return { text: 'Negate', icon: X, color: 'text-red-500' };
      default:
        return { text: 'Non richieste', icon: Bell, color: 'text-yellow-500' };
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifiche Push
          </CardTitle>
          <CardDescription>
            Le notifiche push non sono supportate su questo browser
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statusInfo = getPermissionStatus();
  const StatusIcon = statusInfo.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifiche Push
        </CardTitle>
        <CardDescription>
          Ricevi notifiche istantanee per messaggi, likes e match
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            <div>
              <p className="font-medium">Stato Notifiche</p>
              <p className="text-sm text-muted-foreground">{statusInfo.text}</p>
            </div>
          </div>
          {isSubscribed ? (
            <div className="flex items-center gap-2 text-sm text-green-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Attive
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-gray-400" />
              Inattive
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Riceverai notifiche per:</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                💬
              </div>
              <span>Nuovi messaggi dai tuoi match</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                ❤️
              </div>
              <span>Likes ricevuti sul tuo profilo</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                🎉
              </div>
              <span>Nuovi match trovati</span>
            </div>
          </div>
        </div>

        {/* Devices */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Funziona su:</p>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm">
              <Monitor className="h-4 w-4" />
              Desktop
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-sm">
              <Smartphone className="h-4 w-4" />
              Mobile
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 space-y-3">
          {!isSubscribed ? (
            <Button
              onClick={subscribe}
              disabled={isLoading || permission === 'denied'}
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              <Bell className="h-4 w-4 mr-2" />
              {isLoading ? 'Attivazione...' : 'Attiva Notifiche'}
            </Button>
          ) : (
            <Button
              onClick={unsubscribe}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <BellOff className="h-4 w-4 mr-2" />
              {isLoading ? 'Disattivazione...' : 'Disattiva Notifiche'}
            </Button>
          )}

          {permission === 'denied' && (
            <p className="text-xs text-center text-muted-foreground">
              Hai negato il permesso. Vai nelle impostazioni del browser per abilitare le notifiche.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};