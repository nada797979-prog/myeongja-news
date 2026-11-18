/* 명자뉴스 채널 서비스 워커
   - 화면 파일도 '인터넷 먼저'로 받아 새 버전이 바로 반영되게 (실패하면 저장해 둔 화면 사용)
   - 뉴스·날씨 같은 외부 데이터는 항상 새로 시도하고, 실패하면 캐시 사용 */
const CACHE = "myeongja-news-v10";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./videos.js",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => null))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 외부 데이터(뉴스·날씨): 네트워크 우선, 실패하면 캐시
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => null);
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // 화면 파일: 네트워크 우선(새 버전 바로 반영), 실패하면 캐시 → 없으면 index.html
  event.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => null);
      }
      return res;
    }).catch(() =>
      caches.match(req).then((cached) => cached || caches.match("./index.html"))
    )
  );
});
