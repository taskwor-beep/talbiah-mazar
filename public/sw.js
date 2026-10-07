importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'mazar-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // 1. Navigation requests (HTML pages): NETWORK FIRST
  // Always fetch the freshest index.html so script hashes are always up to date
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((res) => res || caches.match('/'));
        })
    );
    return;
  }

  // 2. Static Assets: Cache first with Network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});

// 3. Handle Push Notifications while app is closed (Fallback for non-OneSignal pushes)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const rawData = event.data.json();
    // OneSignalSDK.sw.js handles its own push notifications natively
    if (rawData && (rawData.custom || rawData.onesignal || rawData.notificationId)) {
      return;
    }
    const options = {
      body: rawData.body || 'لديك تحديث جديد حول رحلتك',
      icon: rawData.icon || '/icon.svg',
      badge: '/icon.svg',
      vibrate: [200, 100, 200, 100, 200],
      data: {
        url: rawData.url || '/'
      }
    };
    event.waitUntil(
      self.registration.showNotification(rawData.title || 'مزار - إشعار جديد', options)
    );
  } catch (e) {
    // Non-JSON push payload
  }
});

// 4. Open app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
