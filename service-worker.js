const CACHE_NAME = "farmkeeper-v25";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./manifest.json",
    "./css/style.css",
    "./js/app.js",
    "./js/db.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

// ================================
// INSTALL
// ================================
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
    );
    self.skipWaiting();
});

// ================================
// ACTIVATE
// ================================
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

// ================================
// FETCH
// ================================
self.addEventListener("fetch", event => {
    const request = event.request;

    // Never cache POST/PUT/PATCH/DELETE requests.
    // This is important for the FarmKeeper AI API because it uses POST.
    if (request.method !== "GET") {
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                // Only cache successful GET responses.
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseClone).catch(() => {});
                    });
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});

self.addEventListener("notificationclick", event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
            const existing = list.find(c => "focus" in c);
            if (existing) return existing.focus();
            return clients.openWindow("./");
        })
    );
});
