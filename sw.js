// Service Worker para GrafiSantos Print

var CACHE_NAME = "grafisantos-v3";
var urlsToCache = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];

// Instalação do Service Worker
self.addEventListener("install", function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(function(cache) {
            console.log("Cache aberto: " + CACHE_NAME);
            return cache.addAll(urlsToCache);
        })
    );
});

// Ativação - limpar caches antigas
self.addEventListener("activate", function(event) {
    var cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log("Cache antigo removido: " + cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Interceptar pedidos - servir do cache
self.addEventListener("fetch", function(event) {
    event.respondWith(
        caches.match(event.request)
        .then(function(response) {
            // Cache hit - devolve resposta do cache
            if (response) {
                return response;
            }
            // Fallback para a rede
            return fetch(event.request)
                .then(function(response) {
                    // Verificar se é uma resposta válida
                    if (!response || response.status !== 200 || response.type !== "basic") {
                        return response;
                    }
                    // Clonar resposta para guardar no cache
                    var responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            cache.put(event.request, responseToCache);
                        });
                    return response;
                });
        })
    );
});
