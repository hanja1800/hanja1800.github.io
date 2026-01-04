// Service Worker for Hanja 1800 PWA
// 버전을 바꿔야 브라우저가 "어? 새거네?" 하고 인식합니다. 숫자를 하나 올렸습니다.
const CACHE_VERSION = 'hanja-pwa-v23'; 
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/radicals.html',
    '/css/base.css',
    '/css/layout.css',
    '/css/components.css',
    '/js/common.js',
    '/js/index.js',
    '/js/radicals.js',
    '/manifest.json'
];

const DATA_RESOURCES = [
    '/data.json',
    '/radicals_metadata.json',
    '/version.json'
];

// 1. 설치 (Install)
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_RESOURCES))
            .then(() => self.skipWaiting())
    );
});

// 2. 활성화 및 옛날 캐시 청소 (Activate)
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

// 3. 파일 요청 처리 (Fetch) - 여기가 핵심 변경 사항입니다!
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET' || url.origin !== location.origin) return;

    // 전략 변경: Network First (네트워크 우선)
    // 설명: 무조건 서버에 먼저 요청해서 최신 파일을 가져옵니다.
    // 만약 인터넷이 끊겼거나 서버 에러가 나면, 그때 캐시(저장된 파일)를 보여줍니다.
    event.respondWith(
        fetch(request)
            .then(response => {
                // 서버에서 잘 받아왔으면, 다음을 위해 캐시를 최신으로 갱신해둠
                const responseClone = response.clone();
                // 데이터 파일인지 정적 파일인지 구분해서 저장
                if (DATA_RESOURCES.some(res => url.pathname.endsWith(res))) {
                    caches.open(DATA_CACHE).then(cache => cache.put(request, responseClone));
                } else {
                    caches.open(STATIC_CACHE).then(cache => cache.put(request, responseClone));
                }
                return response;
            })
            .catch(() => {
                // 인터넷 연결 안 됨 -> 저장된 캐시라도 보여주자
                return caches.match(request);
            })
    );
});
