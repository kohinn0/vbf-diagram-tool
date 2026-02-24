    if (isDarkMode) {
        document.body.classList.remove('light-mode');
        e.target.innerText = '☀️ Világos Mód';
    } else {
        document.body.classList.add('light-mode');
        e.target.innerText = '🌙 Sötét Mód';
    }
});

// ==========================================
// JS OFFLINE SYSTEM MECHANIKA PWA
// ==========================================

function updateOfflineUI() {
    const queue = JSON.parse(localStorage.getItem('vbf_offline_queue') || '[]');
    if (!navigator.onLine) {
        offlineDot.style.background = '#ef4444'; // Piros
        offlineText.innerText = 'Offline';
        offlineText.style.color = '#ef4444';
    } else {
        offlineDot.style.background = '#10b981'; // Zöld
        offlineText.innerText = 'Online';
        offlineText.style.color = '#10b981';
    }

    if (queue.length > 0) {
        btnSyncOffline.style.display = 'inline-block';
        offlineCountSpan.innerText = queue.length;
    } else {
        btnSyncOffline.style.display = 'none';
    }
}

// Szinkronizáció gomb
btnSyncOffline?.addEventListener('click', async () => {
    if (!navigator.onLine) return alert("Továbbra sincs internet kapcsolatod. Várj egy kicsit!");
    if (!currentToken) return alert("Be kell jelentkezned a szinkronizáláshoz!");

    btnSyncOffline.disabled = true;
    btnSyncOffline.innerText = "Syncing...";

    let queue = JSON.parse(localStorage.getItem('vbf_offline_queue') || '[]');
    let successCount = 0;
    let failedQueue = [];

    for (let i = 0; i < queue.length; i++) {
        let payload = queue[i];
        const oldId = payload._offline_id;
        const method = payload._method || 'POST';
        const endpoint = payload._endpoint || '/reports';

        delete payload._offline_id; // Remove internal tracking tags before API
        delete payload._method;
        delete payload._endpoint;

        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
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
    updateOfflineUI();
