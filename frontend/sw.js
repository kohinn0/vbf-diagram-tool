/**
 * VBF Service Worker — Offline PWA támogatás (4.1)
 * Terepi felülvizsgálatokhoz: amikor nincs internet.
 *
 * Stratégia:
 * - Statikus fájlok: NetworkFirst (online: friss, offline: cache)
 * - API kérések: Nincs cache; offline esetén POST/PUT → offline queue
 */

const CACHE_NAME = 'vbf-cache-v4';
const STATIC_ASSETS = [
    '/app.html',
    '/css/style.css',
    '/css/dashboard.css',
    '/css/sitetree.css',
    '/js/app.js',
    '/js/main.js',
    '/js/data.js',
    '/js/sanitize.js',
    '/js/validation.js',
    '/index.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js',
];

// Install: előcache-eljük a statikus fájlokat (offline fallback)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
            .then(() => self.skipWaiting())
    );
});

// Activate: régi cache-ek törlése
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch: API nincs cache-elve; statikus NetworkFirst
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API kérések — soha ne cache-eljük, csak network (vagy offline queue)
    if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => response)
                .catch(async () => {
                    const cached = await caches.match(event.request);
                    if (cached) return cached;
                    if (event.request.method !== 'GET') {
                        try {
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
                        } catch (e) {
                            return new Response(JSON.stringify({ offline: true, error: 'Queue mentés sikertelen' }), {
                                status: 503,
                                headers: { 'Content-Type': 'application/json' }
                            });
                        }
                    }
                    return new Response('Offline — adat nem elérhető', { status: 503 });
                })
        );
        return;
    }

    // Statikus tartalom: NetworkFirst (először hálózat, hiba esetén cache)
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
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

function saveToOfflineQueue(data) {
    return openDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('queue', 'readwrite');
            tx.objectStore('queue').add(data);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    });
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
