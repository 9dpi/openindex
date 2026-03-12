// OpenIndex V2 - Service Worker
// Cache Name và Version
const CACHE_NAME = 'openindex-v2-cache-v1';
const API_CACHE_NAME = 'openindex-api-cache-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/', // Root
  '/index.html',
  '/style.css',
  '/app.js',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js',
  'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css'
];

// Install Event - Cache các assets tĩnh
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Intercept network requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // API requests (Google Apps Script endpoint)
  if (url.href.includes('script.google.com/macros/s')) {
    event.respondWith(
      handleApiRequest(event.request)
    );
    return;
  }
  
  // Static assets
  if (event.request.method === 'GET') {
    event.respondWith(
      handleStaticRequest(event.request)
    );
  }
});

/**
 * Handle API requests with stale-while-revalidate strategy
 */
async function handleApiRequest(request) {
  const apiCache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await apiCache.match(request);
  const fetchPromise = fetch(request).then(async networkResponse => {
    // Clone response for cache
    const responseToCache = networkResponse.clone();
    
    // Only cache successful responses
    if (networkResponse.ok) {
      await apiCache.put(request, responseToCache);
      console.log('✅ API response cached');
    }
    
    return networkResponse;
  }).catch(error => {
    console.error('API fetch failed:', error);
    throw error;
  });
  
  // Return cached response immediately, then update cache
  if (cachedResponse) {
    console.log('📡 Serving API from cache');
    
    // Update cache in background
    fetchPromise.catch(() => {
      console.log('🔄 Background cache update failed');
    });
    
    return cachedResponse;
  }
  
  // No cache available, wait for network
  return fetchPromise;
}

/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    console.log('📁 Serving static from cache:', request.url);
    
    // Always try to update cache in background
    fetchAndCache(request, cache);
    
    return cachedResponse;
  }
  
  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    // Cache the new response
    await cache.put(request, networkResponse.clone());
    console.log('💾 Cached new asset:', request.url);
    
    return networkResponse;
  } catch (error) {
    console.error('Fetch failed:', error);
    
    // If offline and request is for HTML, return offline page
    if (request.mode === 'navigate') {
      return cache.match('/index.html');
    }
    
    throw error;
  }
}

/**
 * Fetch and cache in background
 */
async function fetchAndCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    
    // Only cache if response is ok and not too large
    if (networkResponse.ok && networkResponse.status === 200) {
      const contentLength = networkResponse.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) < 1024 * 1024) { // 1MB limit
        await cache.put(request, networkResponse.clone());
        console.log('🔄 Background cache updated:', request.url);
      }
    }
  } catch (error) {
    // Silent fail for background updates
    console.log('⚠️ Background update failed:', error.message);
  }
}

/**
 * Periodic cache cleanup
 */
async function cleanupOldCacheEntries() {
  const apiCache = await caches.open(API_CACHE_NAME);
  const requests = await apiCache.keys();
  
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  requests.forEach(async request => {
    const response = await apiCache.match(request);
    if (response) {
      const dateHeader = response.headers.get('date');
      if (dateHeader) {
        const responseDate = new Date(dateHeader).getTime();
        if (responseDate < oneDayAgo) {
          await apiCache.delete(request);
          console.log('🧹 Cleaned old API cache entry');
        }
      }
    }
  });
}

// Clean up old cache entries every hour
self.addEventListener('periodicsync', event => {
  if (event.tag === 'cleanup-cache') {
    event.waitUntil(cleanupOldCacheEntries());
  }
});

// Push notifications (optional future feature)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New opportunities available in OpenIndex!',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'OpenIndex Update', options)
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});

// Background sync for failed API requests
self.addEventListener('sync', event => {
  if (event.tag === 'sync-api-requests') {
    console.log('🔄 Background sync triggered');
    // You could implement retry logic for failed API calls here
  }
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(API_CACHE_NAME)
      .then(() => {
        event.ports[0].postMessage({ success: true });
      });
  }
});
