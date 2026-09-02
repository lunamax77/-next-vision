const CACHE_NAME = "attendance-shell-v1";
const SHELL_FILES = ["./", "index.html", "app.js", "config.js", "manifest.json", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isShellFile = SHELL_FILES.some((f) => url.pathname.endsWith(f.replace("./", "")));
  if (!isShellFile) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    self.registration.showNotification("勤怠確認", {
      body: "新しい打刻がありました",
      icon: "icon-192.png",
      badge: "icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("admin/index.html"));
});
