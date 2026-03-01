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
            if (!navigator.onLine) {
                offlineDot.style.background = '#ef4444'; // Piros
                offlineText.innerText = 'Offline';
                offlineText.style.color = '#ef4444';
            } else {
                offlineDot.style.background = '#10b981'; // Zöld
                offlineText.innerText = 'Online';
                offlineText.style.color = '#10b981';
            }
        }

        if (btnSyncOffline) {
            if (queue.length > 0) {
                btnSyncOffline.style.display = 'inline-block';
                if (offlineCountSpan) offlineCountSpan.innerText = queue.length;
            } else {
                btnSyncOffline.style.display = 'none';
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
            btnSyncOffline.innerHTML = `🔄 Szinkronizálás (<span id="offlineCount">${failedQueue.length}</span>)`;
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
