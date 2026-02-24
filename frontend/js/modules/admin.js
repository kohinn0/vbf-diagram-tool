        btnSaveCloud.style.display = 'none';
        btnExportWord.style.display = 'none';
        if (btnExportPdfReport) btnExportPdfReport.style.display = 'none';
        if (btnEmailReport) btnEmailReport.style.display = 'none';
        document.getElementById('btnFinalize').style.display = 'none';
        document.getElementById('navAdmin').style.display = 'none';

        const cloudTab = document.querySelector('.nav-tab[data-target="tab-cloud"]');
        const masterTab = document.querySelector('.nav-tab[data-target="tab-master-data"]');
        if (cloudTab) cloudTab.style.display = 'none';
        if (masterTab) masterTab.style.display = 'none';

        currentSavedReportId = null;
        if (document.getElementById('reportListContainer')) {
            document.getElementById('reportListContainer').innerHTML = '<p>Jelentkezz be a jegyzőkönyvek megtekintéséhez.</p>';
        }
    }
}

async function fetchAdminUsers() {
    const list = document.getElementById('adminUserList');
    if (!list) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) {
            list.innerHTML = '<tr><td colspan="6">Hiba történt a felhasználók lekérdezése közben. Nincs jogosultságod vagy lejárt a tokened.</td></tr>';
            return;
        }
        const users = await res.json();
        if (!Array.isArray(users)) return;
        list.innerHTML = '';

        // Populate the Dropdown for Job Assignments as well
        const jobAssignSelect = document.getElementById('adminJobAssignSelect');
        if (jobAssignSelect) {
            jobAssignSelect.innerHTML = '<option value="">-- Válassz kollégát --</option>';
        }

        users.forEach(u => {
            if (jobAssignSelect) {
                const opt = document.createElement('option');
                opt.value = u.id;
                opt.text = `${u.username} (${u.role})`;
                jobAssignSelect.appendChild(opt);
            }

            const tr = document.createElement('tr');
            const expiry = u.subscription_expires ? new Date(u.subscription_expires).toISOString().split('T')[0] : '';
            tr.innerHTML = `
                    <td>${u.id}</td>
                    <td>${u.username}</td>
                    <td>
                        <select onchange="updateUser(${u.id}, {is_active: this.value === 'active'})">
                            <option value="active" ${u.is_active ? 'selected' : ''}>Aktív</option>
                            <option value="inactive" ${!u.is_active ? 'selected' : ''}>Tiltott</option>
                        </select>
                    </td>
                    <td>
                        <select onchange="updateUser(${u.id}, {role: this.value})">
                            <option value="TECH" ${u.role === 'TECH' ? 'selected' : ''}>Villanyszerelő</option>
                            <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>Admin / Cégvezető</option>
                        </select>
                    </td>
                    <td>
                        <input type="date" value="${expiry}" onchange="updateUser(${u.id}, {subscription_expires: this.value})">
                    </td>
                    <td>
                        <button class="btn btn-danger btn-small" onclick="deleteUser(${u.id})">Törlés</button>
                    </td>
                `;
            list.appendChild(tr);
        });
    } catch (err) { console.error(err); }
}

window.updateUser = async function (id, data) {
    try {
        // Fix date format if needed (handle empty date string -> null)
        if (data.subscription_expires !== undefined) {
            if (data.subscription_expires) {
                data.subscription_expires = new Date(data.subscription_expires).toISOString();
            } else {
                data.subscription_expires = null;
            }
        }
        const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(data)
        });
        if (res.ok) alert('Felhasználó frissítve!');
        else alert('Hiba a frissítés során!');
    } catch (err) { alert(err.message); }
};

window.deleteUser = async function (id) {
    if (!confirm('Biztosan törölni szeretnéd ezt a felhasználót?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        if (res.ok) {
            alert('Felhasználó törölve!');
            fetchAdminUsers();
        } else {
            alert('Hiba a törlés során!');
        }
    } catch (err) { alert(err.message); }
};


    btnSyncOffline.disabled = false;
    btnSyncOffline.innerHTML = `🔄 Szinkronizálás (<span id="offlineCount">${failedQueue.length}</span>)`;

    if (successCount > 0) {
        alert(`Sikeresen felszinkronizálva ${successCount} db Offline jegyzőkönyv a felhőbe!`);
        fetchReports(); // Frissítjük a szerveres listát
    } else if (failedQueue.length > 0) {
        alert("Sajnos néhány vagy az összes szinkronizáció elbukott a szerverhibából fakadóan.");
    }
});

// Listeners for network changes
window.addEventListener('online', updateOfflineUI);
window.addEventListener('offline', updateOfflineUI);

// Initial check
updateOfflineUI();

// ==========================================
// CRM JOBS / NAPTÁR ÉS FELADATOK
// ==========================================

window.fetchJobs = async function () {
    const container = document.getElementById('jobListContainer');
    if (!container || !currentToken) return;

    try {
        const res = await fetch(`${API_BASE_URL}/jobs`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error("Hiba a feladatok betöltésekor");

        const jobs = await res.json();
        container.innerHTML = '';

        if (jobs.length === 0) {
            container.innerHTML = '<span class="empty-state">Nincs folyamatban lévő kiosztott feladatod.</span>';
            return;
        }

        jobs.forEach(job => {
            const card = document.createElement('div');
            card.className = 'prop-group panel-glass';
            card.style.background = 'rgba(255,255,255,0.05)';
            card.style.padding = '15px';
            card.style.borderRadius = '8px';
            card.style.borderLeft = job.status === 'COMPLETED' ? '4px solid #10b981' :
                job.status === 'IN_PROGRESS' ? '4px solid #f59e0b' : '4px solid #3b82f6';

            const dateStr = job.scheduled_date ? new Date(job.scheduled_date).toLocaleString('hu-HU') : 'Nincs dátum kiosztva';

            card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <h4 style="margin:0; font-size:1.2rem; color:var(--accent);">${job.title}</h4>
                        <span style="font-size: 0.9rem; font-weight: bold; color: ${job.status === 'COMPLETED' ? '#10b981' : job.status === 'IN_PROGRESS' ? '#f59e0b' : '#3b82f6'};">${job.status}</span>
                    </div>
                    <p style="margin: 0; font-size: 0.9rem;"><strong>Helyszín:</strong> ${job.address || '-'}</p>
                    <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Időpont:</strong> ${dateStr}</p>
                    <p style="margin: 0 0 15px 0; font-size: 0.9rem;"><strong>Leírás:</strong> ${job.description || '-'}</p>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-small" onclick="updateJobStatus(${job.id}, 'IN_PROGRESS')" style="flex:1;">Kiszállás alatt / Folyamatban</button>
                        <button class="btn btn-primary btn-small" onclick="updateJobStatus(${job.id}, 'COMPLETED')" style="flex:1;">Megtörtént / Kész</button>
                        <button class="btn btn-accent btn-small" onclick="startJobWork(${job.id}, \`${job.title || ''}\`, \`${job.address || ''}\`)" style="flex: 2; background: #10b981; color: white;">🚀 Munka Kezdése (Jegyzőkönyv)</button>
                    </div>
                `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = '<p style="color:red">Hiba a feladatok betöltése során.</p>';
    }
}

// A TECH is tudja frissíteni a státuszt
window.updateJobStatus = async function (jobId, newStatus) {
    try {
        const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/status?status=${newStatus}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
            alert("Feladat státusza frissítve!");
            fetchJobs();
        } else {
            alert("Sikertelen frissítés! Nincs jogosultságod vagy hiba történt.");
        }
    } catch (e) { console.error(e); }
};

window.startJobWork = async function (jobId, jobTitle, jobAddress) {
    if (!confirm("Ezzel elkezdesz egy új jegyzőkönyvet ehhez a munkához. A jelenlegi rajz törlődik. Folytatod?")) return;

    // Törlés és alaphelyzet
    document.getElementById('btnClear').click();

    // Adatok betöltése
    document.getElementById('documentTitle').value = jobTitle || "Új Vizsgálat";
    document.getElementById('siteAddress').value = jobAddress || "";

    // Státusz beállítása "IN_PROGRESS"
    try {
        await fetch(`${API_BASE_URL}/jobs/${jobId}/status?status=IN_PROGRESS`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        fetchJobs(); // Update the list in background
    } catch (e) { console.error("Could not update job status:", e); }

    // Átváltás a Jegyzőkönyv Adatok fülre
    const tabMatches = Array.from(document.querySelectorAll('.nav-tab')).find(t => t.getAttribute('data-target') === 'tab-report');
    if (tabMatches) tabMatches.click();
};

// Az ADMIN új felhasználót tud felvenni
document.getElementById('btnAdminCreateUser')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnAdminCreateUser');
    const uName = document.getElementById('adminNewUsername').value;
    const uPass = document.getElementById('adminNewPassword').value;
    const uRole = document.getElementById('adminNewRole').value;
    const errDiv = document.getElementById('adminCreateUserError');

    if (!uName || !uPass) {
        if (errDiv) errDiv.innerText = 'Felhasználónév és jelszó is kötelező!';
        return;
    }

    try {
        btn.disabled = true;
        const res = await fetch(`${API_BASE_URL}/admin/users?role=${uRole}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ username: uName, password: uPass })
        });

        if (res.ok) {
            alert("Új felhasználó sikeresen létrehozva!");
            document.getElementById('adminNewUsername').value = '';
            document.getElementById('adminNewPassword').value = '';
            if (errDiv) errDiv.innerText = '';
            fetchAdminUsers();
        } else {
            const data = await res.json();
            if (errDiv) errDiv.innerText = data.detail || 'Hiba történt a létrehozáskor.';
        }
    } catch (e) {
        console.error(e);
        if (errDiv) errDiv.innerText = 'Hálózat vagy szerver hiba!';
    } finally {
        btn.disabled = false;
    }
});

// Az ADMIN tud új feladatot létrehozni
document.getElementById('btnAdminCreateJob')?.addEventListener('click', async () => {
    const title = document.getElementById('adminJobTitle').value;
    const address = document.getElementById('adminJobAddress').value;
    const desc = document.getElementById('adminJobDesc').value;
    const dt = document.getElementById('adminJobDate').value; // from datetime-local
    const assignee = document.getElementById('adminJobAssignSelect').value;

    if (!title || !assignee) return alert("A Cím és a Kijelölt kolléga megadása kötelező!");

    const payload = {
        title: title,
        address: address,
        description: desc,
        scheduled_date: dt ? new Date(dt).toISOString() : null,
        assigned_to_id: parseInt(assignee),
        status: "PENDING"
    };

    try {
        const res = await fetch(`${API_BASE_URL}/admin/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("Feladat sikeresen kiosztva!");
            document.getElementById('adminJobTitle').value = '';
            document.getElementById('adminJobAddress').value = '';
            document.getElementById('adminJobDesc').value = '';
            fetchJobs(); // Ujratöltés, hogy az admin lássa a kiosztott munkáit a naptárban
        } else {
            alert("Hiba a feladat kiosztásakor!");
        }
    } catch (e) { console.error(e); }
});
