const CACHE_NAME = "traceya-v1"
const STATIC_CACHE = "traceya-static-v1"

// Files to cache for offline functionality
const STATIC_FILES = [
  "/",
  "/login",
  "/dashboard",
  "/capture",
  "/queue",
  "/settings",
  "/manifest.json",
  "/icon-192.jpg",
  "/icon-512.jpg",
]

// Install event - cache static files
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker")

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static files")
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log("[SW] Static files cached successfully")
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error("[SW] Failed to cache static files:", error)
      }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker")

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log("[SW] Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        console.log("[SW] Service worker activated")
        return self.clients.claim()
      }),
  )
})

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return
  }

  // Handle navigation requests
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Serve from cache when offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Fallback to offline page or dashboard
            return caches.match("/dashboard")
          })
        }),
    )
    return
  }

  // Handle other requests (API, assets, etc.)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache and update in background
        fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone)
              })
            }
          })
          .catch(() => {
            // Network failed, but we have cache
          })

        return cachedResponse
      }

      // Not in cache, try network
      return fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Network failed and not in cache
          if (request.destination === "image") {
            // Return placeholder for images
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
              { headers: { "Content-Type": "image/svg+xml" } },
            )
          }
          throw new Error("Network failed and resource not cached")
        })
    }),
  )
})

// Background sync event
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag)

  if (event.tag === "background-sync-collections") {
    event.waitUntil(
      // Notify the main app to sync
      self.clients
        .matchAll()
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "BACKGROUND_SYNC",
              tag: event.tag,
            })
          })
        }),
    )
  }
})

// Push notification event (for future use)
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received")

  const options = {
    body: "Your herb collections have been synced successfully",
    icon: "/icon-192.jpg",
    badge: "/icon-192.jpg",
    tag: "sync-notification",
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification("traceya - Sync Complete", options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked")

  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      // Focus existing window or open new one
      if (clients.length > 0) {
        return clients[0].focus()
      }
      return self.clients.openWindow("/dashboard")
    }),
  )
})

console.log("[SW] Service worker script loaded")
