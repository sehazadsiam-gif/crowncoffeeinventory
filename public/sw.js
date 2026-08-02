const CACHE_NAME = 'crown-coffee-v2'

// Core assets to cache for offline support
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// Install: pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silently ignore failed caches (some may 404 in dev)
      })
    })
  )
  self.skipWaiting()
})

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})

// Fetch: Network-first strategy with fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension://')) {
    return
  }

  // Skip API calls — let browser fetch directly without SW interception
  if (request.url.includes('/api/')) {
    return
  }

  // For pages and assets: network-first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Store a copy of the response in cache
        if (response && response.status === 200) {
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
        }
        return response
      })
      .catch(() => {
        // Offline fallback: return from cache
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // If navigating to a page, return cached root
          if (request.destination === 'document') {
            return caches.match('/')
          }
        })
      })
  )
})
