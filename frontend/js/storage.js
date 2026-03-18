/**
 * PWA Offline Szinkronizációs Rendszer
 * Nyomonköveti a hálózati kapcsolatot és a háttérben menti a helyi várólistát a szerverre amint online lesz a hálózat.
 */

import { API } from './api.js';

export const Storage = {
    initOfflineSystem() {
        const _this = this;
        window.addEventListener('online', () => {
            _this.updateOfflineUI();
            const queue = JSON.parse(localStorage.getItem('vbf_offline_queue') || '[]');
            if (queue.length > 0) {
                setTimeout(() => _this.syncOfflineQueue(null), 1500);
            }
        });
        window.addEventListener('offline', () => _this.updateOfflineUI());

        this.updateOfflineUI();

        const btnSyncOffline = document.getElementById('btnSyncOffline');
        if (btnSyncOffline) {
            btnSyncOffline.addEventListener('click', () => this.syncOfflineQueue(btnSyncOffline));
        }
        window.Storage = this;
    },

    updateOfflineUI() {
        const offlineDot = document.getElementById('offlineDot');
        const offlineText = document.getElementById('offlineText');
        const btnSyncOffline = document.getElementById('btnSyncOffline');
        const offlineCountSpan = document.getElementById('offlineCount');

        const queue = JSON.parse(localStorage.getItem('vbf_offline_queue') || '[]');

        if (offlineDot && offlineText) {
            if (!navigator.onLine) {
                offlineDot.style.background = '#ef4444';
                offlineText.innerText = 'Offline – változtatások helyben mentve';
                offlineText.style.color = '#ef4444';
            } else if (queue.length > 0) {
                offlineDot.style.background = '#f59e0b'; // Borostyán
                offlineText.innerText = queue.length === 1 ? 'Offline mentve, szinkronizálás vár' : `${queue.length} mentés vár szinkronizálásra`;
                offlineText.style.color = '#f59e0b';
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

        const btn = btnSyncOffline || document.getElementById('btnSyncOffline');
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Szinkronizálás...";
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
                    const data = await res.json().catch(() => ({}));
                    if (method === 'POST' && data.id != null) {
                        window.currentSavedReportId = data.id;
                        try { localStorage.setItem('vbf_last_report_id', String(data.id)); } catch (_) {}
                    }
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

        const btn = btnSyncOffline || document.getElementById('btnSyncOffline');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `🔄 Szinkronizálás (<span id="offlineCount">${failedQueue.length}</span>)`;
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
