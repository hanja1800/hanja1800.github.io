// Service Worker for Hanja 1800 PWA
const CACHE_VERSION = 'hanja-pwa-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

// Static resources to cache
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/radicals.html',
    '/style.css',
    '/common.js',
    '/script.js',
    '/radicals.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Data resources to cache with network-first strategy
const DATA_RESOURCES = [
    '/data.json',
    '/radicals_metadata.json',
    '/version.json'
];

// Install event - cache static resources
self.addEventListener('install', event => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Caching static resources');
                return cache.addAll(STATIC_RESOURCES);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName.startsWith('hanja-pwa-') && cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE)
                        .map(cacheName => {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - network first for data, cache first for static
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip external requests
    if (url.origin !== location.origin) {
        return;
    }

    // Network-first strategy for data files
    if (DATA_RESOURCES.some(resource => url.pathname.endsWith(resource))) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache the new version
                    const responseClone = response.clone();
                    caches.open(DATA_CACHE).then(cache => {
                        cache.put(request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(request);
                })
        );
        return;
    }

    // Cache-first strategy for static files
    event.respondWith(
        caches.match(request)
            .then(cached => {
                if (cached) {
                    return cached;
                }
                return fetch(request)
                    .then(response => {
                        // Cache the new resource
                        const responseClone = response.clone();
                        caches.open(STATIC_CACHE).then(cache => {
                            cache.put(request, responseClone);
                        });
                        return response;
                    });
            })
    );
});

