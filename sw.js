const CACHE = "odeme-takip-v4";
const ASSETS = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(ASSETS.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => null)))
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (err) {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;

  const isDoc = req.mode === "navigate" || req.destination === "document";

  e.respondWith(
    caches.match(req, { ignoreSearch: isDoc }).then((hit) => {
      if (hit) {
        if (!isDoc) {
          fetch(req)
            .then((res) => {
              if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            })
            .catch(() => {});
        }
        return hit;
      }
      return fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match("./index.html")
            .then((fb) => fb || caches.match("./"))
            .then(
              (fb) =>
                fb ||
                new Response("Çevrimdışı", {
                  status: 503,
                  headers: { "Content-Type": "text/plain; charset=utf-8" }
                })
            )
        );
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      if (windows.length) return windows[0].focus();
      return clients.openWindow("./");
    })
  );
});
