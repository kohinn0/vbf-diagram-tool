/**
 * VBF Service Worker — Offline PWA támogatás
 * Terepi felülvizsgálatokhoz: amikor nincs internet.
 * 
 * Stratégia:
 * - Statikus fájlok: Cache-first (app.html, css, js)
 * - API kérések: Network-first, fallback offline queue-ra
 */

const CACHE_NAME = 'vbf-cache-v3';
const STATIC_ASSETS = [
    '/app.html',
    '/css/style.css',
    '/js/app.js',
    '/js/data.js',
    '/js/sanitize.js',
    '/js/validation.js',
    '/index.html',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js',
];

// Install: Cache statikus fájlokat
self.addEventListener('install', (event) => {
    console.log('[SW] Install — Statikus tartalom cache-elése');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: Régi cache-ek törlése
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate — Régi cache törlése');
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch: Cache-first statikus, Network-first API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API kérések → Network-first (Csak saját origin-en belüli API-kra!)
    if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // API válasz cache-elése (GET request case)
                    if (event.request.method === 'GET' && response.ok) {
                        const cloned = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                    }
                    return response;
                })
                .catch(async () => {
                    // Offline → próbáljuk a cache-ből
                    const cached = await caches.match(event.request);
                    if (cached) return cached;

                    // Ha POST/PUT → offline queue-ba mentjük
                    if (event.request.method !== 'GET') {
                        // Klónozzuk a requestet és mentjük IndexedDB-be
                        const body = await event.request.clone().text();
                        await saveToOfflineQueue({
                            url: event.request.url,
                            method: event.request.method,
                            headers: Object.fromEntries(event.request.headers.entries()),
                            body: body,
                            timestamp: Date.now()
                        });
                        return new Response(JSON.stringify({
                            offline: true,
                            message: 'A kérés elmentve — internet visszatérésekor automatikusan szinkronizálódik.'
                        }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }

                    return new Response('Offline — adat nem elérhető', { status: 503 });
                })
        );
        return;
    }

    // Statikus tartalom → Cache-first
    event.respondWith(
        caches.match(event.request)
            .then(cached => cached || fetch(event.request)
                .then(response => {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                    return response;
                })
            )
    );
});

// ═══════════════════════════════════════
// OFFLINE QUEUE (IndexedDB)
// ═══════════════════════════════════════
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('vbf-offline', 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('queue')) {
                db.createObjectStore('queue', { autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveToOfflineQueue(data) {
    const db = await openDB();
    const tx = db.transaction('queue', 'readwrite');
    tx.objectStore('queue').add(data);
    return tx.complete;
}

async function processOfflineQueue() {
    const db = await openDB();
    const tx = db.transaction('queue', 'readonly');
    const store = tx.objectStore('queue');
    const allKeys = await new Promise(resolve => {
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result);
    });
    const allItems = await new Promise(resolve => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
    });

    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        try {
            await fetch(item.url, {
                method: item.method,
                headers: item.headers,
                body: item.body
            });
            // Sikeres → törlés
            const delTx = db.transaction('queue', 'readwrite');
            delTx.objectStore('queue').delete(allKeys[i]);
        } catch {
            // Még offline → hagyjuk
            console.log('[SW] Szinkronizálás sikertelen, újra próbáljuk később');
            break;
        }
    }
}

// Amikor visszajön a net → szinkronizálás
self.addEventListener('sync', (event) => {
    if (event.tag === 'vbf-sync') {
        event.waitUntil(processOfflineQueue());
    }
});

// Periodikus szinkronizálás
self.addEventListener('message', (event) => {
    if (event.data === 'sync-queue') {
        processOfflineQueue();
    }
});
