// service-worker.js
// Custom service worker source for next-pwa with Web Push support.
// Workbox precaching is injected at build time via self.__WB_MANIFEST.

import { precacheAndRoute } from 'workbox-precaching'

self.__WB_DISABLE_DEV_LOGS = true

// eslint-disable-next-line no-underscore-dangle
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'ProductivityOS', body: event.data.text() }
  }

  const title = payload.title ?? 'ProductivityOS'
  const options = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { url: payload.url ?? '/dashboard' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})
