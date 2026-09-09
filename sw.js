// Service Worker simplificado
var CACHE = "grafisantos-v3";

self.addEventListener("install", function(e) {
    e.waitUntil(
        caches.open(CACHE).then(function(cache) {
            return cache.addAll([
                "./",
                "./index.html",
                "./manifest.json",
                "./icon-192.png",
                "./icon-512.png"
            ]);
        })
    );
});

self.addEventListener("activate", function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(key) {
                    return key !== CACHE;
                }).map(function(key) {
                    return caches.delete(key);
                })
            );
        })
    );
});

self.addEventListener("fetch", function(e) {
    e.respondWith(
        caches.match(e.request).then(function(r) {
            return r || fetch(e.request);
        })
    );
});
