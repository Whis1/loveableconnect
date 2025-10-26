import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const NotificationSettings = () => {
  const { permission, isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifiche Push
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifiche Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
      </CardContent>
    </Card>
  );
};