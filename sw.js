/* 명자채널 서비스 워커
   - 화면 파일도 '인터넷 먼저'로 받아 새 버전이 바로 반영되게 (실패하면 저장해 둔 화면 사용)
   - 뉴스·날씨 같은 외부 데이터는 캐시에 담지 않고 항상 새로 받습니다.
     (주소에 붙는 시각 표시 때문에 캐시가 끝없이 쌓이던 문제도 함께 막습니다) */
const CACHE = "myeongja-news-v15";
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

  // 외부 데이터(뉴스·날씨): 브라우저·중간 캐시를 쓰지 않고 그대로 받아 옵니다.
  if (url.origin !== self.location.origin) {
    if (/(^|\.)(rss2json\.com|allorigins\.win|codetabs\.com|cors\.lol)$/.test(url.hostname)) {
      event.respondWith(fetch(req, { cache: "no-store" }).catch(() => fetch(req)));
    }
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
