/**
 * PWA Offline Szinkronizációs Rendszer
 * Nyomonköveti a hálózati kapcsolatot és a háttérben menti a helyi várólistát a szerverre amint online lesz a hálózat.
 */

import { API } from './api.js';

export const Storage = {
    initOfflineSystem() {
        const _this = this;
        window.addEventListener('online', () => _this.updateOfflineUI());
        window.addEventListener('offline', () => _this.updateOfflineUI());

        // Initial check
        this.updateOfflineUI();

        // Gomb esemény rögzítése (ha van ilyen elem a HTML-ben)
        const btnSyncOffline = document.getElementById('btnSyncOffline');
        if (btnSyncOffline) {
            btnSyncOffline.addEventListener('click', () => this.syncOfflineQueue(btnSyncOffline));
        }
    },

    updateOfflineUI() {
        const offlineDot = document.getElementById('offlineDot');
        const offlineText = document.getElementById('offlineText');
        const btnSyncOffline = document.getElementById('btnSyncOffline');
        const offlineCountSpan = document.getElementById('offlineCount');

        const queue = JSON.parse(localStorage.getItem('vbf_offline_queue') || '[]');

        if (offlineDot && offlineText) {
            offlineDot.classList.remove('offline-dot--offline', 'offline-dot--pending', 'offline-dot--online');
            offlineText.classList.remove('offline-text--offline', 'offline-text--pending', 'offline-text--online');
            if (!navigator.onLine) {
                offlineDot.classList.add('offline-dot--offline');
                offlineText.classList.add('offline-text--offline');
                offlineText.innerText = 'Offline';
            } else if (queue.length > 0) {
                offlineDot.classList.add('offline-dot--pending');
                offlineText.classList.add('offline-text--pending');
                offlineText.innerText = queue.length === 1 ? 'Offline mentve, szinkronizálás vár' : `${queue.length} mentés vár szinkronizálásra`;
            } else {
                offlineDot.classList.add('offline-dot--online');
                offlineText.classList.add('offline-text--online');
                offlineText.innerText = 'Online';
            }
        }

        if (btnSyncOffline) {
            if (queue.length > 0) {
                btnSyncOffline.classList.remove('is-hidden');
                if (offlineCountSpan) offlineCountSpan.innerText = queue.length;
            } else {
                btnSyncOffline.classList.add('is-hidden');
            }
        }

        const offlineIndicator = document.getElementById('offlineIndicator');
        if (offlineIndicator) {
            if (queue.length > 0) {
                offlineIndicator.title = queue.length === 1
                    ? '1 db mentés vár szinkronizálásra'
                    : `${queue.length} db mentés vár szinkronizálásra`;
            } else {
                offlineIndicator.title = navigator.onLine ? 'Online' : 'Offline';
            }
        }
    },

    async syncOfflineQueue(btnSyncOffline) {
        if (!navigator.onLine) return alert("Továbbra sincs internet kapcsolatod. Várj egy kicsit!");
        const token = window.currentToken || localStorage.getItem('vbf_token');
        if (!token) return alert("Be kell jelentkezned a szinkronizáláshoz!");

        if (btnSyncOffline) {
            btnSyncOffline.disabled = true;
            btnSyncOffline.innerText = "Syncing...";
        }

        let queue = JSON.parse(localStorage.getItem('vbf_offline_queue') || '[]');
        let successCount = 0;
        let failedQueue = [];

        for (let i = 0; i < queue.length; i++) {
            let payload = queue[i];
            const oldId = payload._offline_id;
            const method = payload._method || 'POST';
            const endpoint = payload._endpoint || '/api/reports';

            delete payload._offline_id; // Remove internal tracking tags before API
            delete payload._method;
            delete payload._endpoint;

            try {
                // Determine base URL dynamically or fallback to localhost
                const baseUrl = window.API_BASE_URL || 'http://localhost:8000';
                const res = await fetch(`${baseUrl}${endpoint}`, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    successCount++;
                } else {
                    payload._offline_id = oldId;
                    payload._method = method;
                    payload._endpoint = endpoint;
                    failedQueue.push(payload);
                }
            } catch (e) {
                payload._offline_id = oldId; // restore tags
                payload._method = method;
                payload._endpoint = endpoint;
                failedQueue.push(payload);
            }
        }

        localStorage.setItem('vbf_offline_queue', JSON.stringify(failedQueue));
        this.updateOfflineUI();

        if (btnSyncOffline) {
            btnSyncOffline.disabled = false;
            btnSyncOffline.innerHTML = `Szinkronizálás (<span id="offlineCount">${failedQueue.length}</span>)`;
        }

        if (successCount > 0) {
            if (typeof window.showToast === 'function') window.showToast(`Sikeresen felszinkronizálva ${successCount} db offline jegyzőkönyv!`, 'success');
            else alert(`Sikeresen felszinkronizálva ${successCount} db Offline jegyzőkönyv a felhőbe!`);
            // Custom event trigger, hogy az app.js is észrevegye és frissítse a listát
            window.dispatchEvent(new CustomEvent('offlineSyncComplete'));
        } else if (failedQueue.length > 0) {
            alert("Sajnos néhány vagy az összes szinkronizáció elbukott a szerverhibából fakadóan.");
        }
    }
};
