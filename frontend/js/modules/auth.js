// ==========================================
// AUTHENTICATION & API INTEGRATION (NEW)
// ==========================================
const API_BASE_URL = 'http://100.87.221.65:8001/api';
let currentToken = localStorage.getItem('vbf_token');
let currentUser = localStorage.getItem('vbf_user');

const userInfoSpan = document.getElementById('userInfo');
const btnLoginNav = document.getElementById('btnLoginNav');
const btnSaveCloud = document.getElementById('btnSaveCloud');
const btnExportWord = document.getElementById('btnExportWord');
const btnExportPdfReport = document.getElementById('btnExportPdfReport');
const loginModal = document.getElementById('loginModal');
const btnSubmitLogin = document.getElementById('btnSubmitLogin');
const btnEmailReport = document.getElementById('btnEmailReport');

if (btnEmailReport) {
    btnEmailReport.addEventListener('click', () => {
        if (currentSavedReportId) {
            sendEmailReport(currentSavedReportId);
        } else {
            alert('Előbb menteni / betölteni kell egy jegyzőkönyvet a felhőből!');
        }
    });
}

// OFFLINE INDICATOR ELEMENTS
const offlineIndicator = document.getElementById('offlineIndicator');
const offlineDot = document.getElementById('offlineDot');
const offlineText = document.getElementById('offlineText');
const btnSyncOffline = document.getElementById('btnSyncOffline');
const offlineCountSpan = document.getElementById('offlineCount');
const btnCloseLogin = document.getElementById('btnCloseLogin');
const loginError = document.getElementById('loginError');
let currentSavedReportId = null;

function formatDocId(typeStr, id, dateStr) {
    if (!id) return "ÚJ";
    const t = (typeStr || "VBF").toUpperCase();
    const shortT = t === "EPH" ? "EPH" : "VBF";
    const d = dateStr ? new Date(dateStr) : new Date();
    const y = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
    const padId = String(id).padStart(3, '0');
    return `${shortT} -${y} -${padId} `;
}

async function fetchReports() {
    const reportListContainer = document.getElementById('reportListContainer');
    if (!reportListContainer || !currentToken) {
        if (reportListContainer) reportListContainer.innerHTML = '<p>Jelentkezz be a jegyzőkönyvek megtekintéséhez.</p>';
        return;
    }

    reportListContainer.innerHTML = '<p>Betöltés...</p>';

    try {
        const res = await fetch(`${API_BASE_URL}/reports`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const reports = await res.json();

        if (reports.length === 0) {
            reportListContainer.innerHTML = '<p>Még nincs elmentett jegyzőkönyved.</p>';
            return;
        }

        reportListContainer.innerHTML = '';
        reports.forEach(rep => {
            const docId = formatDocId(rep.report_type, rep.id, rep.created_at);
            const card = document.createElement('div');
            card.className = 'report-card panel-glass';
            card.innerHTML = `
                    <h4>[${docId}] ${rep.title}</h4>
                    <p class="meta">Típus: ${rep.report_type.toUpperCase()}<br>Létrehozva: ${new Date(rep.created_at).toLocaleDateString()}</p>
                    <div class="actions">
                        <button class="btn btn-primary btn-small" onclick="loadReport(${rep.id})">Betöltés</button>
                        <button class="btn btn-secondary btn-small" onclick="cloneReport(${rep.id})">Másolás</button>
                        <button class="btn btn-accent btn-small" onclick="sendEmailReport(${rep.id})" style="background: #10b981; color: white;">Email Küldése ✉️</button>
                        <button class="btn btn-danger btn-small" onclick="deleteReport(${rep.id})">Törlés</button>
                    </div>
                `;
            reportListContainer.appendChild(card);
        });
    } catch (err) {
        reportListContainer.innerHTML = '<p style="color:red">Hiba a betöltés során.</p>';
    }
}

// UI Frissítő függvény
async function updateAuthUI() {
    if (currentToken && currentUser) {
        userInfoSpan.innerText = `Szia, ${currentUser}!`;
        btnLoginNav.innerText = 'Kijelentkezés';
        btnLoginNav.classList.replace('btn-secondary', 'btn-danger');
        btnSaveCloud.style.display = 'inline-block';
        document.getElementById('btnFinalize').style.display = 'inline-block';
        fetchReports();
        fetchJobs(); // NEW: Fetch jobs when logged in

        // Check Admin Status
        try {
            const res = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                const userData = await res.json();
                window.currentUserRole = userData.role;

                const cloudTab = document.querySelector('.nav-tab[data-target="tab-cloud"]');
                const masterTab = document.querySelector('.nav-tab[data-target="tab-master-data"]');

                if (userData.role === 'ADMIN') {
                    document.getElementById('navAdmin').style.display = 'inline-block';
                    if (cloudTab) cloudTab.style.display = 'inline-block';
                    if (masterTab) masterTab.style.display = 'inline-block';
                    fetchAdminUsers();
                } else {
                    document.getElementById('navAdmin').style.display = 'none';
                    if (cloudTab) cloudTab.style.display = 'none';
                    if (masterTab) masterTab.style.display = 'none';
                }
            }
        } catch (err) { console.error("Admin check failed", err); }

    } else {
        userInfoSpan.innerText = '';
        btnLoginNav.innerText = 'Bejelentkezés';
        btnLoginNav.classList.replace('btn-danger', 'btn-secondary');
