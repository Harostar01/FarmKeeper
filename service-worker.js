const CACHE_NAME = "farmkeeper-v20";

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

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(
                    FILES_TO_CACHE
                );

            })

    );

    self.skipWaiting();

});


// ================================
// ACTIVATE
// ================================

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(cacheNames => {

                return Promise.all(

                    cacheNames
                        .filter(
                            name =>
                                name !== CACHE_NAME
                        )
                        .map(
                            name =>
                                caches.delete(name)
                        )

                );

            })

    );

    self.clients.claim();

});


// ================================
// FETCH
// ================================

self.addEventListener("fetch", event => {

    event.respondWith(

        fetch(event.request)
            .then(response => {

                // Save the newest version
                // in the cache

                const responseClone =
                    response.clone();

                caches.open(CACHE_NAME)
                    .then(cache => {

                        cache.put(
                            event.request,
                            responseClone
                        );

                    });

                return response;

            })
            .catch(() => {

                // If offline, use cached version

                return caches.match(
                    event.request
                );

            })

    );

});

self.addEventListener("notificationclick", event => {
    event.notification.close();
    event.waitUntil(clients.matchAll({type:"window", includeUncontrolled:true}).then(list => {
        const existing=list.find(c => "focus" in c);
        if(existing) return existing.focus();
        return clients.openWindow("./");
    }));
});
