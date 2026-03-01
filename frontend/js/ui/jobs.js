export function initJobs() {
    window.fetchJobs = async function () {
        const container = document.getElementById('jobListContainer');
        if (!container || !window.currentToken) return;

        try {
            const res = await fetch(`${window.API_BASE_URL}/api/jobs`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
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
    };

    window.updateJobStatus = async function (jobId, newStatus) {
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/jobs/${jobId}/status?status=${newStatus}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (res.ok) {
                alert("Feladat státusza frissítve!");
                window.fetchJobs();
            } else {
                alert("Sikertelen frissítés! Nincs jogosultságod vagy hiba történt.");
            }
        } catch (e) { console.error(e); }
    };

    window.startJobWork = async function (jobId, jobTitle, jobAddress) {
        if (!confirm("Ezzel elkezdesz egy új jegyzőkönyvet ehhez a munkához. A jelenlegi rajz törlődik. Folytatod?")) return;

        const btnClear = document.getElementById('btnClear');
        if (btnClear) btnClear.click();

        document.getElementById('documentTitle').value = jobTitle || "Új Vizsgálat";
        document.getElementById('siteAddress').value = jobAddress || "";

        try {
            await fetch(`${window.API_BASE_URL}/api/jobs/${jobId}/status?status=IN_PROGRESS`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            window.fetchJobs();
        } catch (e) { console.error("Could not update job status:", e); }

        const tabMatches = Array.from(document.querySelectorAll('.nav-tab')).find(t => t.getAttribute('data-target') === 'tab-report');
        if (tabMatches) tabMatches.click();
    };

    document.getElementById('btnAdminCreateJob')?.addEventListener('click', async () => {
        const title = document.getElementById('adminJobTitle').value;
        const address = document.getElementById('adminJobAddress').value;
        const desc = document.getElementById('adminJobDesc').value;
        const dt = document.getElementById('adminJobDate').value;
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
            const res = await fetch(`${window.API_BASE_URL}/api/admin/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.currentToken}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Feladat sikeresen kiosztva!");
                document.getElementById('adminJobTitle').value = '';
                document.getElementById('adminJobAddress').value = '';
                document.getElementById('adminJobDesc').value = '';
                window.fetchJobs();
            } else {
                alert("Hiba a feladat kiosztásakor!");
            }
        } catch (e) { console.error(e); }
    });
}
