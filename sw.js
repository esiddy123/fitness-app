// ============================================
// SERVICE WORKER — Offline caching
// ============================================

const CACHE_NAME = 'carb-cycle-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/cycle.js',
  '/js/db.js',
  '/js/calendar.js',
  '/js/meals.js',
  '/js/workout.js',
  '/js/logger.js',
  '/js/dashboard.js',
  '/js/app.js',
  '/data/meals.json',
  '/data/exercises.json',
  '/data/common-foods.json',
  '/manifest.json'
];

// Install — cache all assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — only serve from pre-cached whitelist, no dynamic caching
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      // Only fetch from network if it's a whitelisted asset — never cache unknown requests
      return fetch(e.request);
    }).catch(() => {
      // Offline fallback for navigation
      if (e.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
