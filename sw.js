// Service Worker for Hanja 1800 PWA
// 버전을 올려서 브라우저가 새 설정을 즉시 반영하게 합니다.
const CACHE_VERSION = 'hanja-pwa-v21'; 
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

// 1. 현재의 쪼개진 파일명들에 맞게 수정했습니다.
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/radicals.html',
    '/css/base.css',      // 수정됨
    '/css/layout.css',    // 수정됨
    '/css/components.css', // 수정됨
    '/js/common.js',      // 수정됨
    '/js/index.js',       // script.js 대신 index.js
    '/js/radicals.js',
    '/manifest.json'
];

// 2. data.json 하나만 캐시하도록 설정했습니다.
const DATA_RESOURCES = [
    '/data.json',
    '/radicals_metadata.json',
    '/version.json'
];

// Install event - 정적 리소스 캐싱
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_RESOURCES))
            .then(() => self.skipWaiting())
    );
});

// Activate event - 오래된 캐시 삭제
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name.startsWith('hanja-pwa-') && name !== STATIC_CACHE && name !== DATA_CACHE)
                        .map(name => caches.delete(name))
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - 데이터는 네트워크 우선, 정적 파일은 캐시 우선
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.origin !== location.origin) return;

    // 데이터 파일 처리 (Network First)
    if (DATA_RESOURCES.some(resource => url.pathname.endsWith(resource))) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(DATA_CACHE).then(cache => cache.put(request, responseClone));
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // 정적 파일 처리 (Cache First)
    event.respondWith(
        caches.match(request)
            .then(cached => {
                return cached || fetch(request).then(response => {
                    const responseClone = response.clone();
                    caches.open(STATIC_CACHE).then(cache => cache.put(request, responseClone));
                    return response;
                });
            })
    );
});
