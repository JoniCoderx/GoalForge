/* GYM·LOG service worker — lock-screen notifications only (no offline caching). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = { title: 'GYM·LOG', body: '', tag: 'gym', url: '/gym' };
  try {
    data = { ...data, ...event.data.json() };
  } catch (e) {
    /* non-JSON payload: show defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      renotify: true,
      icon: '/gym-icon-192.png',
      badge: '/gym-icon-192.png',
      data: { url: data.url },
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/gym';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes('/gym') && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
