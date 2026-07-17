const CACHE_NAME = "minz-adventure-shell-v1";
const SAFE_SHELL_PATHS = ["/", "/world", "/goals", "/training", "/inventory"];
const PRIVATE_PATH_PREFIXES = ["/api/", "/login", "/children", "/parent", "/setup", "/room"];

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SAFE_SHELL_PATHS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivatePath(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && SAFE_SHELL_PATHS.includes(url.pathname)) {
            void caches.open(CACHE_NAME).then((cache) => cache.put(url.pathname, response.clone()));
          }
          return response;
        })
        .catch(async () => (await caches.match(url.pathname)) ?? (await caches.match("/"))),
    );
    return;
  }

  if (["script", "style", "image", "font"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
        if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      })),
    );
  }
});
