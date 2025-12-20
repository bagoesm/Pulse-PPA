// Service Worker for Push Notifications

self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();
  
  const options = {
    body: data.message || data.body || 'Anda memiliki notifikasi baru',
    icon: '/Logo.svg',
    badge: '/Logo.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      taskId: data.taskId
    },
    actions: [
      { action: 'open', title: 'Buka' },
      { action: 'close', title: 'Tutup' }
    ],
    tag: data.tag || 'pulse-notification',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Pulse PPA', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            if (event.notification.data?.taskId) {
              client.postMessage({
                type: 'NOTIFICATION_CLICK',
                taskId: event.notification.data.taskId
              });
            }
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

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
