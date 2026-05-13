// 지락실 게임 — 최소 서비스 워커
// 캐시 전략: HTML은 network-first (최신 코드 받기), 그 외 자산은 cache-first

const CACHE = "jiraksil-v3";
const PRECACHE = [
  "./",
  "./icon.svg",
  "./sounds/start.mp3",
  "./sounds/fail.mp3",
  "./sounds/success.mp3",
  "./images/napd.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) =>
        // 개별 catch — 일부 자산이 빠져도 나머지는 캐시
        Promise.all(
          PRECACHE.map((url) =>
            c.add(url).catch((err) => {
              console.warn("[sw] precache miss:", url, err);
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");
  const isManifest = url.pathname.endsWith(".webmanifest");

  if (isHTML || isManifest) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match("./")),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (!res || res.status !== 200 || res.type === "opaque") return res;
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
          return res;
        })
        .catch(() => cached || Response.error());
    }),
  );
});
