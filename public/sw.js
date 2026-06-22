const CACHE_NAME = 'mortada-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 1. Only intercept http/https requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(event.request.url);

  // 2. Bypass service worker for local Vite dev server files/HMR to prevent dev issues
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    if (event.request.headers.get('Upgrade') === 'websocket' || url.pathname.includes('@vite') || url.pathname.includes('node_modules')) {
      return;
    }
  }

  event.respondWith(
    fetch(event.request)
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) {
          return cached;
        }
        // Always return a valid Response to avoid Service Worker TypeError crash
        return new Response('Network error', { 
          status: 408, 
          statusText: 'Network Connection Failed' 
        });
      })
  );
});

