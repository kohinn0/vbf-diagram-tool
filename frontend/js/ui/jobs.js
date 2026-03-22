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
                const stMod = job.status === 'COMPLETED' ? 'completed' : job.status === 'IN_PROGRESS' ? 'in_progress' : 'assigned';
                card.className = `prop-group panel-glass job-card job-card--${stMod}`;

                const dateStr = job.scheduled_date ? new Date(job.scheduled_date).toLocaleString('hu-HU') : 'Nincs dátum kiosztva';

                card.innerHTML = `
                    <div class="job-card__head">
                        <h4 class="job-card__title">${job.title}</h4>
                        <span class="job-card__status job-card__status--${stMod}">${job.status}</span>
                    </div>
                    <p class="job-card__meta"><strong>Helyszín:</strong> ${job.address || '-'}</p>
                    <p class="job-card__meta job-card__meta--gap"><strong>Időpont:</strong> ${dateStr}</p>
                    <p class="job-card__meta job-card__meta--desc"><strong>Leírás:</strong> ${job.description || '-'}</p>
                    <div class="job-card__actions">
                        <button type="button" class="btn btn-secondary btn-small job-card__btn-flex" onclick="updateJobStatus(${job.id}, 'IN_PROGRESS')">Kiszállás alatt / Folyamatban</button>
                        <button type="button" class="btn btn-primary btn-small job-card__btn-flex" onclick="updateJobStatus(${job.id}, 'COMPLETED')">Megtörtént / Kész</button>
                        <button type="button" class="btn btn-primary btn-small btn-flex-grow-2" onclick="startJobWork(${job.id}, \`${job.title || ''}\`, \`${job.address || ''}\`)">Munka kezdése (jegyzőkönyv)</button>
                    </div>
                `;
                container.appendChild(card);
            });
        } catch (err) {
            console.error(err);
            container.innerHTML = '<p class="form-error-text">Hiba a feladatok betöltése során.</p>';
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
