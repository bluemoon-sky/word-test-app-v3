// Service Worker - 영단어 마스터 PWA
const CACHE_NAME = 'word-master-v1';

// 설치 시 기본 리소스 캐시
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
            ]);
        })
    );
    // 즉시 활성화
    self.skipWaiting();
});

// 활성화 시 오래된 캐시 정리
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// 네트워크 우선, 실패 시 캐시 사용 (Network-first 전략)
self.addEventListener('fetch', (event) => {
    // API 요청은 캐시하지 않음
    if (event.request.url.includes('/rest/') || event.request.url.includes('supabase')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 성공한 응답은 캐시에 저장
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // 네트워크 실패 시 캐시에서 가져오기
                return caches.match(event.request);
            })
    );
});
