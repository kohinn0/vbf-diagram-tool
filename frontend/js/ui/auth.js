import { API } from '../api.js';

export function initAuth() {
    const userInfoSpan = document.getElementById('userInfo');
    const btnLoginNav = document.getElementById('btnLoginNav');
    const btnSaveCloud = document.getElementById('btnSaveCloud');
    const btnExportWord = document.getElementById('btnExportWord');
    const btnExportPdfReport = document.getElementById('btnExportPdfReport');
    const loginModal = document.getElementById('loginModal');
    const btnSubmitLogin = document.getElementById('btnSubmitLogin');
    const btnEmailReport = document.getElementById('btnEmailReport');
    const btnCloseLogin = document.getElementById('btnCloseLogin');
    const loginError = document.getElementById('loginError');
    const btnFinalize = document.getElementById('btnFinalize');
    const navAdmin = document.getElementById('navAdmin');
    const cloudTab = document.querySelector('.nav-tab[data-target="tab-cloud"]');
    const masterTab = document.querySelector('.nav-tab[data-target="tab-master-data"]');
    const dashboardTab = document.getElementById('navDashboard');
    const reportListContainer = document.getElementById('reportListContainer');

    function updateAuthUI() {
        if (window.currentToken && window.currentUser) {
            if (userInfoSpan) userInfoSpan.innerText = `Szia, ${window.currentUser}!`;
            if (btnLoginNav) {
                btnLoginNav.innerText = 'Kijelentkezés';
                btnLoginNav.classList.replace('btn-secondary', 'btn-danger');
            }
            if (btnSaveCloud) btnSaveCloud.style.display = 'inline-block';
            if (btnFinalize) btnFinalize.style.display = 'inline-block';

            if (typeof window.fetchReports === 'function') window.fetchReports();
            if (typeof window.fetchJobs === 'function') window.fetchJobs();

            // Check Admin Status
            fetch(`${window.API_BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            })
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Not authorized");
                })
                .then(userData => {
                    window.currentUserRole = userData.role;
                    if (userData.role === 'ADMIN') {
                        if (navAdmin) navAdmin.style.display = 'inline-block';
                        if (cloudTab) cloudTab.style.display = 'inline-block';
                        if (masterTab) masterTab.style.display = 'inline-block';
                        if (dashboardTab) dashboardTab.style.display = 'inline-block';
                        if (typeof window.fetchAdminUsers === 'function') window.fetchAdminUsers();
                        if (typeof window.fetchCompanySettings === 'function') window.fetchCompanySettings();
                    } else {
                        if (navAdmin) navAdmin.style.display = 'none';
                        if (cloudTab) cloudTab.style.display = 'none';
                        if (masterTab) masterTab.style.display = 'none';
                        if (dashboardTab) dashboardTab.style.display = 'none';
                    }
                })
                .catch(err => console.error("Admin check failed", err));

        } else {
            if (userInfoSpan) userInfoSpan.innerText = '';
            if (btnLoginNav) {
                btnLoginNav.innerText = 'Bejelentkezés';
                btnLoginNav.classList.replace('btn-danger', 'btn-secondary');
            }
            if (btnSaveCloud) btnSaveCloud.style.display = 'none';
            if (btnExportWord) btnExportWord.style.display = 'none';
            if (btnExportPdfReport) btnExportPdfReport.style.display = 'none';
            if (btnEmailReport) btnEmailReport.style.display = 'none';
            if (btnFinalize) btnFinalize.style.display = 'none';
            if (navAdmin) navAdmin.style.display = 'none';
            if (cloudTab) cloudTab.style.display = 'none';
            if (masterTab) masterTab.style.display = 'none';

            window.currentSavedReportId = null;
            if (reportListContainer) {
                reportListContainer.innerHTML = '<p>Jelentkezz be a jegyzőkönyvek megtekintéséhez.</p>';
            }
        }
    }

    if (btnLoginNav) {
        btnLoginNav.addEventListener('click', () => {
            if (window.currentToken) {
                // Kijelentkezés
                localStorage.removeItem('vbf_token');
                localStorage.removeItem('vbf_user');
                window.currentToken = null;
                window.currentUser = null;
                updateAuthUI();
            } else {
                if (loginModal) loginModal.style.display = 'flex';
            }
        });
    }

    if (btnCloseLogin) {
        btnCloseLogin.addEventListener('click', () => {
            if (loginModal) loginModal.style.display = 'none';
            if (loginError) loginError.innerText = '';
        });
    }

    if (btnSubmitLogin) {
        btnSubmitLogin.addEventListener('click', async () => {
            const username = document.getElementById('loginUser').value;
            const password = document.getElementById('loginPass').value;

            if (!username || !password) {
                if (loginError) loginError.innerText = 'Kérlek töltsd ki mindkét mezőt!';
                return;
            }

            try {
                const token = await API.login(username, password);

                window.currentToken = token;
                window.currentUser = username;

                localStorage.setItem('vbf_token', window.currentToken);
                localStorage.setItem('vbf_user', window.currentUser);

                updateAuthUI();
                if (loginModal) loginModal.style.display = 'none';
                if (loginError) loginError.innerText = '';
            } catch (error) {
                console.error("Login hiba:", error);
                if (loginError) loginError.innerText = error.message;
            }
        });
    }

    window.deleteMyAccount = async function () {
        if (!confirm('FIGYELEM! Ezzel minden adatod és jegyzőkönyved VÉGLEG törlődik. Nincs visszaút. Folytatod?')) return;
        try {
            const res = await fetch(`${window.API_BASE_URL}/users/me`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (res.ok) {
                alert('Fiók törölve. Viszlát!');
                localStorage.clear();
                window.location.reload();
            }
        } catch (err) { alert('Hiba a törlés során.'); }
    };

    // Alapértelmezett állapot beállítása betöltéskor
    updateAuthUI();

    return {
        updateAuthUI
    };
}
