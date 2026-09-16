// Service Worker GrafiSantos
// Versão: incrementa este número a cada alteração importante
const CACHE_VERSION = "grafisantos-v11";
const CACHE_ASSETS = [
    "icon-192.png",
    "icon-512.png",
    "manifest.json"
];

// Instalação: guarda só os assets estáticos (NÃO guarda HTML)
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            return cache.addAll(CACHE_ASSETS).catch(() => {
                // Se falhar algum asset, continua na mesma
                console.log("⚠️ Alguns assets não foram guardados em cache");
            });
        })
    );
    // Ativa imediatamente o novo SW
    self.skipWaiting();
});

// Ativação: apaga TODAS as caches antigas
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((nomes) => {
            return Promise.all(
                nomes.map((nome) => {
                    if (nome !== CACHE_VERSION) {
                        console.log("🗑️ Cache antiga removida:", nome);
                        return caches.delete(nome);
                    }
                })
            );
        }).then(() => {
            // Toma controlo imediato das páginas abertas
            return self.clients.claim();
        })
    );
});

// Fetch: estratégia "network-first" para HTML, cache-first para imagens
self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Ignorar pedidos não-GET (ex: POST para Firebase/GitHub)
    if (req.method !== "GET") return;

    // Ignorar pedidos para domínios externos (Firebase, GitHub, CDN)
    if (url.origin !== self.location.origin) return;

    // Ignorar URLs com query (ex: api.github.com?ref=...)
    if (url.search) return;

    // Para ficheiros HTML → NETWORK-FIRST (sempre tenta rede primeiro)
    if (req.headers.get("accept") && req.headers.get("accept").includes("text/html")) {
        event.respondWith(
            fetch(req)
                .then((response) => {
                    // Guarda uma cópia para modo offline
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => {
                        cache.put(req, clone);
                    });
                    return response;
                })
                .catch(() => {
                    // Sem rede → tenta cache
                    return caches.match(req);
                })
        );
        return;
    }

    // Para imagens, ícones, etc. → CACHE-FIRST (rápido, raramente mudam)
    if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp)$/)) {
        event.respondWith(
            caches.match(req).then((cached) => {
                return cached || fetch(req).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => {
                        cache.put(req, clone);
                    });
                    return response;
                });
            })
        );
        return;
    }

    // Tudo o resto → NETWORK-FIRST
    event.respondWith(
        fetch(req).catch(() => caches.match(req))
    );
});

// Permitir que a app force atualização
self.addEventListener("message", (event) => {
    if (event.data === "skipWaiting") {
        self.skipWaiting();
    }
});
