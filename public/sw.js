// Service Worker per Web Push Notifications
console.log('🔔 Service Worker loading...');

// Install event
self.addEventListener('install', (event) => {
  console.log('🔔 Service Worker installed');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('🔔 Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received:', event);

  let notificationData = {
    title: '💕 LoveableConnect',
    body: 'Hai una nuova notifica',
    icon: '/images/love-background.png',
    badge: '/images/love-background.png',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: data.type || 'general',
        data: data.data || { url: '/' },
        requireInteraction: false,
        vibrate: [200, 100, 200]
      };
    } catch (e) {
      console.error('Error parsing notification data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
          for (const client of clientList) {
            const clientOrigin = new URL(client.url).origin;
            if (clientOrigin === self.location.origin && 'focus' in client) {
              client.focus();
              try { client.navigate(urlToOpen); } catch (e) {}
              return;
            }
          }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔔 Notification closed:', event);
});