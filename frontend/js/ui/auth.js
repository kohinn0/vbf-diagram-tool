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
            const linkProfile = document.getElementById('linkProfile');
            if (linkProfile) { linkProfile.textContent = 'Profil'; linkProfile.style.display = 'inline'; }
            if (btnLoginNav) {
                btnLoginNav.innerText = 'Kijelentkezés';
                btnLoginNav.classList.replace('btn-secondary', 'btn-danger');
            }
            const gdprLinks = document.getElementById('gdprLinks');
            if (gdprLinks) gdprLinks.style.display = 'flex';
            if (btnSaveCloud) btnSaveCloud.style.display = 'inline-block';
            if (btnFinalize) btnFinalize.style.display = 'inline-block';

            if (typeof window.fetchReports === 'function') window.fetchReports();
            if (typeof window.fetchJobs === 'function') window.fetchJobs();

            // Check Admin Status
            fetch(`${window.API_BASE_URL}/api/users/me`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            })
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Not authorized");
                })
                .then(userData => {
                    window.currentUserData = userData;
                    window.currentUserRole = userData.role;
                    if (userData.role === 'ADMIN' || userData.role === 'SUPER_ADMIN') {
                        if (navAdmin) navAdmin.style.display = 'inline-block';
                        if (dashboardTab) dashboardTab.style.display = 'inline-block';
                        var linkShopAdmin = document.getElementById('linkShopAdmin');
                        if (linkShopAdmin) linkShopAdmin.style.display = 'inline-block';
                        var navAdminShop = document.getElementById('navAdminShop');
                        if (navAdminShop) navAdminShop.style.display = 'inline-block';
                        if (cloudTab) cloudTab.style.display = 'inline-block';
                        if (masterTab) masterTab.style.display = 'inline-block';
                        if (typeof window.fetchAdminUsers === 'function') window.fetchAdminUsers();
                        if (typeof window.fetchCompanySettings === 'function') window.fetchCompanySettings();
                        if (typeof window.fetchAndShowReminders === 'function') window.fetchAndShowReminders();
                    } else {
                        if (navAdmin) navAdmin.style.display = 'none';
                        if (dashboardTab) dashboardTab.style.display = 'none';
                        var linkShopAdmin = document.getElementById('linkShopAdmin');
                        if (linkShopAdmin) linkShopAdmin.style.display = 'none';
                        var navAdminShop = document.getElementById('navAdminShop');
                        if (navAdminShop) navAdminShop.style.display = 'none';
                        if (cloudTab) cloudTab.style.display = 'inline-block';
                        if (masterTab) masterTab.style.display = 'inline-block';
                        if (typeof window.fetchAndShowReminders === 'function') window.fetchAndShowReminders();
                    }
                    var exp = userData.subscription_expires;
                    if (exp && userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
                        var expDate = new Date(exp);
                        var now = new Date();
                        var days = Math.ceil((expDate - now) / (24 * 60 * 60 * 1000));
                        if (days > 0 && days <= 14 && !sessionStorage.getItem('vbf_expiry_banner_dismissed')) {
                            var banner = document.getElementById('expiryBanner');
                            var text = document.getElementById('expiryBannerText');
                            if (banner && text) {
                                text.textContent = 'Előfizetésed ' + days + ' nap múlva lejár. Frissítsd időben.';
                                banner.style.display = 'flex';
                            }
                        }
                    }
                })
                .catch(err => console.error("Admin check failed", err));

        } else {
            if (userInfoSpan) userInfoSpan.innerText = '';
            var linkProfile = document.getElementById('linkProfile');
            if (linkProfile) linkProfile.style.display = 'none';
            if (btnLoginNav) {
                btnLoginNav.innerText = 'Bejelentkezés';
                btnLoginNav.classList.replace('btn-danger', 'btn-secondary');
            }
            const gdprLinks = document.getElementById('gdprLinks');
            if (gdprLinks) gdprLinks.style.display = 'none';
            if (btnSaveCloud) btnSaveCloud.style.display = 'none';
            if (btnExportWord) btnExportWord.style.display = 'none';
            if (btnExportPdfReport) btnExportPdfReport.style.display = 'none';
            const btnExportDiagramPdf = document.getElementById('btnExportDiagramPdf');
            if (btnExportDiagramPdf) btnExportDiagramPdf.style.display = 'none';
            const btnAuditLog = document.getElementById('btnAuditLog');
            if (btnAuditLog) btnAuditLog.style.display = 'none';
            if (btnEmailReport) btnEmailReport.style.display = 'none';
            if (btnFinalize) btnFinalize.style.display = 'none';
            if (navAdmin) navAdmin.style.display = 'none';
            if (dashboardTab) dashboardTab.style.display = 'none';
            var linkShopAdminEl = document.getElementById('linkShopAdmin');
            if (linkShopAdminEl) linkShopAdminEl.style.display = 'none';
            var navAdminShopEl = document.getElementById('navAdminShop');
            if (navAdminShopEl) navAdminShopEl.style.display = 'none';
            if (cloudTab) cloudTab.style.display = 'none';
            if (masterTab) masterTab.style.display = 'none';

            window.currentSavedReportId = null;
            if (window.updateHeaderReportContext) window.updateHeaderReportContext('', null);
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

    // Jelszó módosítása
    const passwordModal = document.getElementById('passwordModal');
    const linkChangePassword = document.getElementById('linkChangePassword');
    const btnPasswordClose = document.getElementById('btnPasswordClose');
    const btnPasswordSubmit = document.getElementById('btnPasswordSubmit');
    const passwordModalError = document.getElementById('passwordModalError');
    if (linkChangePassword) {
        linkChangePassword.addEventListener('click', (e) => {
            e.preventDefault();
            if (!window.currentToken) return;
            if (passwordModal) {
                document.getElementById('passwordCurrent').value = '';
                document.getElementById('passwordNew').value = '';
                document.getElementById('passwordNewConfirm').value = '';
                if (passwordModalError) passwordModalError.textContent = '';
                passwordModal.style.display = 'flex';
            }
        });
    }
    if (btnPasswordClose) {
        btnPasswordClose.addEventListener('click', () => {
            if (passwordModal) passwordModal.style.display = 'none';
            if (passwordModalError) passwordModalError.textContent = '';
        });
    }
    document.getElementById('expiryBannerDismiss')?.addEventListener('click', () => {
        sessionStorage.setItem('vbf_expiry_banner_dismissed', '1');
        var b = document.getElementById('expiryBanner');
        if (b) b.style.display = 'none';
    });
    var profileModal = document.getElementById('profileModal');
    document.getElementById('linkProfile')?.addEventListener('click', function (e) {
        e.preventDefault();
        if (!window.currentUserData) return;
        var d = window.currentUserData;
        var profileUsername = document.getElementById('profileUsername');
        var profileEmail = document.getElementById('profileEmail');
        var profileCompany = document.getElementById('profileCompany');
        var profileExpiry = document.getElementById('profileExpiry');
        if (profileUsername) profileUsername.textContent = d.username || '';
        if (profileEmail) profileEmail.value = d.email || '';
        if (profileCompany) profileCompany.textContent = d.company_name || '–';
        if (profileExpiry) {
            if (d.subscription_expires) {
                var exp = new Date(d.subscription_expires);
                var now = new Date();
                var days = Math.ceil((exp - now) / (24 * 60 * 60 * 1000));
                profileExpiry.textContent = exp.toLocaleDateString('hu-HU') + (days > 0 ? ' (' + days + ' nap van hátra)' : ' (lejárt)');
            } else {
                profileExpiry.textContent = '–';
            }
        }
        if (profileModal) profileModal.style.display = 'flex';
    });
    document.getElementById('btnProfileClose')?.addEventListener('click', () => { if (profileModal) profileModal.style.display = 'none'; });
    profileModal?.addEventListener('click', function (e) { if (e.target === profileModal) profileModal.style.display = 'none'; });
    document.getElementById('btnProfileSaveEmail')?.addEventListener('click', async () => {
        var email = document.getElementById('profileEmail')?.value?.trim() || null;
        if (!window.currentToken) return;
        try {
            var res = await fetch(window.API_BASE_URL + '/api/users/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + window.currentToken },
                body: JSON.stringify({ email: email })
            });
            if (res.ok) {
                window.currentUserData = await res.json();
                if (window.showToast) window.showToast('Email mentve.', 'success');
            } else {
                var data = await res.json().catch(function () { return {}; });
                if (window.showToast) window.showToast(data.detail || 'Hiba', 'error');
            }
        } catch (err) {
            if (window.showToast) window.showToast('Hiba', 'error');
        }
    });
    document.getElementById('btnProfileChangePassword')?.addEventListener('click', () => {
        if (profileModal) profileModal.style.display = 'none';
        if (passwordModal) {
            document.getElementById('passwordCurrent').value = '';
            document.getElementById('passwordNew').value = '';
            document.getElementById('passwordNewConfirm').value = '';
            passwordModal.style.display = 'flex';
        }
    });
    document.getElementById('btnProfileExportZip')?.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('linkDataExportZip')?.click();
    });
    document.getElementById('linkDeleteAccountFromProfile')?.addEventListener('click', function (e) {
        e.preventDefault();
        if (profileModal) profileModal.style.display = 'none';
        document.getElementById('linkDeleteAccount')?.click();
    });
    var forgotPasswordModal = document.getElementById('forgotPasswordModal');
    document.getElementById('linkForgotPassword')?.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('forgotPasswordEmail').value = '';
        document.getElementById('forgotPasswordStatus').textContent = '';
        if (forgotPasswordModal) forgotPasswordModal.style.display = 'flex';
    });
    document.getElementById('btnForgotPasswordClose')?.addEventListener('click', () => { if (forgotPasswordModal) forgotPasswordModal.style.display = 'none'; });
    forgotPasswordModal?.addEventListener('click', function (e) { if (e.target === forgotPasswordModal) forgotPasswordModal.style.display = 'none'; });
    document.getElementById('btnForgotPasswordSubmit')?.addEventListener('click', async () => {
        var email = document.getElementById('forgotPasswordEmail')?.value?.trim();
        var statusEl = document.getElementById('forgotPasswordStatus');
        if (!email) { if (statusEl) statusEl.textContent = 'Add meg az e-mail címet.'; return; }
        try {
            var res = await fetch(window.API_BASE_URL + '/api/request-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            var data = await res.json().catch(function () { return {}; });
            if (statusEl) statusEl.textContent = data.message || 'Ha van ilyen fiók, linket küldtünk.';
            if (res.ok && forgotPasswordModal) forgotPasswordModal.style.display = 'none';
        } catch (err) {
            if (statusEl) statusEl.textContent = 'Hálózati hiba.';
        }
    });
    var resetToken = new URLSearchParams(window.location.search).get('reset');
    if (resetToken) {
        var resetPanel = document.getElementById('resetPasswordPanel');
        if (resetPanel) resetPanel.style.display = 'flex';
        document.getElementById('btnResetPasswordSubmit')?.addEventListener('click', async () => {
            var newPw = document.getElementById('resetNewPassword')?.value || '';
            var confirmPw = document.getElementById('resetNewPasswordConfirm')?.value || '';
            var errEl = document.getElementById('resetPasswordError');
            if (errEl) errEl.textContent = '';
            if (newPw.length < 8) { if (errEl) errEl.textContent = 'Legalább 8 karakter kell.'; return; }
            if (newPw !== confirmPw) { if (errEl) errEl.textContent = 'A két jelszó nem egyezik.'; return; }
            try {
                var res = await fetch(window.API_BASE_URL + '/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: resetToken, new_password: newPw })
                });
                var data = await res.json().catch(function () { return {}; });
                if (res.ok) {
                    if (window.showToast) window.showToast(data.message || 'Jelszó megváltoztatva.', 'success');
                    history.replaceState({}, '', window.location.pathname);
                    if (resetPanel) resetPanel.style.display = 'none';
                } else {
                    if (errEl) errEl.textContent = data.detail || 'Hiba';
                }
            } catch (err) {
                if (errEl) errEl.textContent = 'Hálózati hiba.';
            }
        });
    }
    if (passwordModal && passwordModal.addEventListener) {
        passwordModal.addEventListener('click', (e) => { if (e.target === passwordModal) passwordModal.style.display = 'none'; });
    }
    if (btnPasswordSubmit) {
        btnPasswordSubmit.addEventListener('click', async () => {
            const current = document.getElementById('passwordCurrent')?.value || '';
            const newPw = document.getElementById('passwordNew')?.value || '';
            const newConfirm = document.getElementById('passwordNewConfirm')?.value || '';
            if (passwordModalError) passwordModalError.textContent = '';
            if (!current) {
                if (passwordModalError) passwordModalError.textContent = 'A jelenlegi jelszó megadása kötelező.';
                return;
            }
            if (!newPw || newPw.length < 8) {
                if (passwordModalError) passwordModalError.textContent = 'Az új jelszónak legalább 8 karakter hosszúnak kell lennie.';
                return;
            }
            if (newPw !== newConfirm) {
                if (passwordModalError) passwordModalError.textContent = 'Az új jelszók nem egyeznek.';
                return;
            }
            btnPasswordSubmit.disabled = true;
            try {
                const res = await fetch(`${window.API_BASE_URL}/api/users/me/password`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.currentToken}` },
                    body: JSON.stringify({ current_password: current, new_password: newPw })
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                    if (window.showToast) window.showToast(data.message || 'Jelszó megváltoztatva.', 'success');
                    if (passwordModal) passwordModal.style.display = 'none';
                } else {
                    if (passwordModalError) passwordModalError.textContent = data.detail || 'Hiba a módosítás során.';
                }
            } catch (err) {
                if (passwordModalError) passwordModalError.textContent = 'Hálózati hiba.';
            }
            btnPasswordSubmit.disabled = false;
        });
    }

    // GDPR: Teljes adatcsomag (ZIP) – jegyzőkönyvek, fényképek, diagramok, minden adat
    const linkDataExportZip = document.getElementById('linkDataExportZip');
    if (linkDataExportZip) {
        linkDataExportZip.addEventListener('click', (e) => {
            e.preventDefault();
            if (!window.currentToken) return;
            const url = `${window.API_BASE_URL}/api/users/me/data-export-zip`;
            const a = document.createElement('a');
            a.href = url;
            a.download = `vbf-adatexport-${new Date().toISOString().slice(0, 10)}.zip`;
            a.setAttribute('download', '');
            const token = window.currentToken;
            fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => {
                    if (!res.ok) throw new Error(res.statusText);
                    return res.blob();
                })
                .then(blob => {
                    const u = URL.createObjectURL(blob);
                    a.href = u;
                    a.click();
                    URL.revokeObjectURL(u);
                    if (window.showToast) window.showToast('Teljes adatcsomag (ZIP) letöltve.', 'success');
                })
                .catch(() => {
                    if (window.showToast) window.showToast('ZIP letöltés sikertelen.', 'error');
                });
        });
    }
    // GDPR: Adataim (JSON) – rövid összefoglaló
    const linkDataExport = document.getElementById('linkDataExport');
    if (linkDataExport) {
        linkDataExport.addEventListener('click', (e) => {
            e.preventDefault();
            if (!window.currentToken) return;
            fetch(`${window.API_BASE_URL}/api/users/me/data-export`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            })
                .then(res => {
                    if (!res.ok) throw new Error(res.statusText);
                    return res.json();
                })
                .then(data => {
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `vbf-adatexport-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                    if (window.showToast) window.showToast('Adatexport (JSON) letöltve.', 'success');
                })
                .catch(() => {
                    if (window.showToast) window.showToast('Adatexport sikertelen.', 'error');
                });
        });
    }
    // GDPR: Fiók törlése – emlékeztető: előbb érdemes letölteni a ZIP-et
    const linkDeleteAccount = document.getElementById('linkDeleteAccount');
    if (linkDeleteAccount) {
        linkDeleteAccount.addEventListener('click', (e) => {
            e.preventDefault();
            if (!window.currentToken) return;
            const msg = 'Fiók törlése előtt érdemes letölteni az adataidat (jegyzőkönyvek, fényképek).\n\nSzeretnéd most letölteni a teljes adatcsomagot (ZIP)?';
            const choice = confirm(msg + '\n\n[OK] = Letöltöm a ZIP-et, majd kérdezünk a törlésre\n[Mégse] = Csak a törlésre kérdezünk (nem töltesz le most)');
            if (choice) {
                const url = `${window.API_BASE_URL}/api/users/me/data-export-zip`;
                fetch(url, { headers: { 'Authorization': `Bearer ${window.currentToken}` } })
                    .then(res => res.ok ? res.blob() : Promise.reject(new Error(res.statusText)))
                    .then(blob => {
                        const u = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = u;
                        a.download = `vbf-adatexport-${new Date().toISOString().slice(0, 10)}.zip`;
                        a.click();
                        URL.revokeObjectURL(u);
                        if (window.showToast) window.showToast('ZIP letöltve. Ha kész, folytathatod a fiók törlését.', 'success');
                    })
                    .catch(() => {});
            }
            if (!confirm('Biztosan törölni szeretnéd a fiókodat? A jegyzőkönyveid és minden adatod végleg törlődik. Ez a lépés nem vonható vissza.')) return;
            if (!confirm('Utolsó kérdés: tényleg töröljük a fiókot?')) return;
            fetch(`${window.API_BASE_URL}/api/users/me`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            })
                .then(res => {
                    if (res.ok) {
                        localStorage.removeItem('vbf_token');
                        localStorage.removeItem('vbf_user');
                        window.currentToken = null;
                        window.currentUser = null;
                        if (window.showToast) window.showToast('Fiók törölve.', 'success');
                        window.location.href = window.location.pathname;
                    } else {
                        return res.json().then(d => { throw new Error(d.detail || 'Hiba'); });
                    }
                })
                .catch(err => {
                    if (window.showToast) window.showToast(err.message || 'Törlés sikertelen.', 'error');
                    else alert(err.message || 'Törlés sikertelen.');
                });
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
            const res = await fetch(`${window.API_BASE_URL}/api/users/me`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (res.ok) {
                if (window.showToast) window.showToast('Fiók törölve. Viszlát!', 'success'); else alert('Fiók törölve. Viszlát!');
                localStorage.clear();
                window.location.reload();
            }
        } catch (err) { if (window.showToast) window.showToast('Hiba a törlés során.', 'error'); else alert('Hiba a törlés során.'); }
    };

    // Alapértelmezett állapot beállítása betöltéskor
    updateAuthUI();

    // Főoldalról / demó / regisztráció link: nincs token → bejelentkezési ablak
    const params = new URLSearchParams(window.location.search);
    if (!window.currentToken && (params.get('from') === 'landing' || params.get('demo') === '1' || params.get('register') === '1')) {
        if (loginModal) loginModal.style.display = 'flex';
        const registerInfo = document.getElementById('loginRegisterInfo');
        if (registerInfo) registerInfo.style.display = params.get('register') === '1' ? 'block' : 'none';
        history.replaceState({}, '', window.location.pathname);
    }
    // Cookie banner (app oldal): ha még nincs elfogadva, megjelenítés + Elfogadom
    (function () {
        const banner = document.getElementById('cookieBanner');
        const accept = document.getElementById('cookieBannerAccept');
        const privacyLink = document.getElementById('cookieBannerPrivacyLink');
        if (privacyLink && (window.API_BASE_URL || window.location.origin)) {
            privacyLink.href = (window.API_BASE_URL || window.location.origin + '/api') + '/legal/privacy';
        }
        if (banner && !localStorage.getItem('cookie_consent')) banner.style.display = 'flex';
        if (accept) accept.addEventListener('click', () => { localStorage.setItem('cookie_consent', '1'); if (banner) banner.style.display = 'none'; });
    })();

    // Stripe sikeres visszatérés: csak ha a backend paid=true, üzenet, majd URL tisztítása
    if (params.has('session_id')) {
        const sid = params.get('session_id');
        const base = window.API_BASE_URL || window.location.origin;
        fetch(`${base}/api/payments/session-status?session_id=${encodeURIComponent(sid)}`)
            .then(r => r.json())
            .then(data => {
                if (data && data.paid) {
                    if (window.showToast) window.showToast('Sikeres vásárlás! Belépési adataidat emailben küldtük.', 'success');
                    else if (typeof alert === 'function') alert('Sikeres vásárlás! Belépési adataidat emailben küldtük.');
                }
                history.replaceState({}, '', window.location.pathname);
            })
            .catch(() => { history.replaceState({}, '', window.location.pathname); });
    }

    return {
        updateAuthUI
    };
}
