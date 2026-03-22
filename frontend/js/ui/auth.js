import { API } from '../api.js';

export function initAuth() {
    const userInfoSpan = document.getElementById('userInfo');
    const navUserMenu = document.getElementById('navUserMenu');
    const navUserMenuTrigger = document.getElementById('navUserMenuTrigger');
    const btnLoginNav = document.getElementById('btnLoginNav');

    function closeNavUserMenu() {
        navUserMenu?.classList.remove('is-open');
        if (navUserMenuTrigger) navUserMenuTrigger.setAttribute('aria-expanded', 'false');
    }
    if (navUserMenuTrigger && navUserMenu) {
        navUserMenuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            navUserMenu.classList.toggle('is-open');
            const isOpen = navUserMenu.classList.contains('is-open');
            navUserMenuTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
        document.addEventListener('click', (e) => {
            if (navUserMenu.classList.contains('is-open') && !navUserMenu.contains(e.target)) {
                closeNavUserMenu();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeNavUserMenu();
        });
        document.getElementById('navUserMenuPanel')?.addEventListener('click', () => {
            closeNavUserMenu();
        });
    }
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

    function setLoginModalMode(mode) {
        const pl = document.getElementById('panelLogin');
        const pr = document.getElementById('panelRegister');
        const titleEl = document.getElementById('loginModalTitle');
        if (!pl || !pr) return;
        if (mode === 'register') {
            pl.classList.add('is-hidden');
            pr.classList.remove('is-hidden');
            if (titleEl) titleEl.textContent = 'Regisztráció';
            try {
                const hasInv = !!sessionStorage.getItem('vbf_reg_invite');
                const re = document.getElementById('regEmail');
                if (re && !hasInv) {
                    re.readOnly = false;
                    re.removeAttribute('aria-readonly');
                }
            } catch (e) { /* ignore */ }
        } else {
            pl.classList.remove('is-hidden');
            pr.classList.add('is-hidden');
            if (titleEl) titleEl.textContent = 'Bejelentkezés';
        }
    }

    function updateAuthUI() {
        if (window.currentToken && window.currentUser) {
            if (userInfoSpan) userInfoSpan.textContent = window.currentUser;
            if (navUserMenu) navUserMenu.classList.remove('is-hidden');
            if (btnLoginNav) {
                btnLoginNav.innerText = 'Kijelentkezés';
                btnLoginNav.classList.replace('btn-secondary', 'btn-danger');
            }
            if (btnSaveCloud) btnSaveCloud.classList.remove('is-hidden');
            if (btnFinalize) btnFinalize.classList.remove('is-hidden');

            const cloudLoginPrompt = document.getElementById('cloudLoginPrompt');
            if (cloudLoginPrompt) cloudLoginPrompt.classList.add('is-hidden');
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
                    const role = (userData.role || '').trim().toUpperCase() || '';
                    window.currentUserRole = role;
                    const isPlatformAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
                    const isCompanyAdmin = role === 'COMPANY_ADMIN';
                    const canCompanyAdminUi = isPlatformAdmin || isCompanyAdmin;
                    if (canCompanyAdminUi) {
                        if (navAdmin) navAdmin.classList.remove('is-hidden');
                        if (dashboardTab) dashboardTab.classList.remove('is-hidden');
                        var linkShopAdmin = document.getElementById('linkShopAdmin');
                        if (linkShopAdmin) linkShopAdmin.classList.remove('is-hidden');
                        var navAdminShop = document.getElementById('navAdminShop');
                        if (navAdminShop) navAdminShop.classList.remove('is-hidden');
                        if (cloudTab) cloudTab.classList.remove('is-hidden');
                        if (masterTab) masterTab.classList.remove('is-hidden');
                        if (typeof window.fetchAdminUsers === 'function') window.fetchAdminUsers();
                        if (typeof window.fetchCompanySettings === 'function') window.fetchCompanySettings();
                    } else {
                        if (navAdmin) navAdmin.classList.add('is-hidden');
                        if (dashboardTab) dashboardTab.classList.add('is-hidden');
                        var linkShopAdmin = document.getElementById('linkShopAdmin');
                        if (linkShopAdmin) linkShopAdmin.classList.add('is-hidden');
                        var navAdminShop = document.getElementById('navAdminShop');
                        if (navAdminShop) navAdminShop.classList.add('is-hidden');
                        if (cloudTab) cloudTab.classList.remove('is-hidden');
                        if (masterTab) masterTab.classList.remove('is-hidden');
                    }
                    var exp = userData.subscription_expires;
                    if (exp && !isPlatformAdmin) {
                        var expDate = new Date(exp);
                        var now = new Date();
                        var days = Math.ceil((expDate - now) / (24 * 60 * 60 * 1000));
                        if (days > 0 && days <= 14 && !sessionStorage.getItem('vbf_expiry_banner_dismissed')) {
                            var banner = document.getElementById('expiryBanner');
                            var text = document.getElementById('expiryBannerText');
                            if (banner && text) {
                                text.textContent = 'Előfizetésed ' + days + ' nap múlva lejár. Frissítsd időben.';
                                banner.classList.remove('is-hidden');
                            }
                        }
                    }
                    var pdfBan = document.getElementById('pdfWatermarkBanner');
                    if (pdfBan) {
                        if (userData.pdf_export_watermarked && !sessionStorage.getItem('vbf_pdf_wm_banner_dismissed')) {
                            pdfBan.classList.remove('is-hidden');
                        } else {
                            pdfBan.classList.add('is-hidden');
                        }
                    }
                    if (btnExportPdfReport) {
                        btnExportPdfReport.innerText = userData.pdf_export_watermarked ? 'PDF (vízjel)' : 'PDF aláírva';
                    }
                    if (typeof window.vbfCartOnUserLoaded === 'function') window.vbfCartOnUserLoaded(userData);
                })
                .catch(err => console.error("Admin check failed", err));

        } else {
            if (userInfoSpan) userInfoSpan.textContent = '';
            closeNavUserMenu();
            if (navUserMenu) navUserMenu.classList.add('is-hidden');
            if (btnLoginNav) {
                btnLoginNav.innerText = 'Bejelentkezés';
                btnLoginNav.classList.replace('btn-danger', 'btn-secondary');
            }
            if (btnSaveCloud) btnSaveCloud.classList.add('is-hidden');
            if (btnExportWord) btnExportWord.classList.add('is-hidden');
            if (btnExportPdfReport) btnExportPdfReport.classList.add('is-hidden');
            if (btnEmailReport) btnEmailReport.classList.add('is-hidden');
            if (btnFinalize) btnFinalize.classList.add('is-hidden');
            if (navAdmin) navAdmin.classList.add('is-hidden');
            if (dashboardTab) dashboardTab.classList.add('is-hidden');
            var linkShopAdminEl = document.getElementById('linkShopAdmin');
            if (linkShopAdminEl) linkShopAdminEl.classList.add('is-hidden');
            var navAdminShopEl = document.getElementById('navAdminShop');
            if (navAdminShopEl) navAdminShopEl.classList.add('is-hidden');
            if (cloudTab) cloudTab.classList.add('is-hidden');
            if (masterTab) masterTab.classList.add('is-hidden');

            window.currentSavedReportId = null;
            if (window.updateHeaderReportContext) window.updateHeaderReportContext('', null);
            if (reportListContainer) reportListContainer.innerHTML = '';
            const cloudLoginPrompt = document.getElementById('cloudLoginPrompt');
            if (cloudLoginPrompt) cloudLoginPrompt.classList.remove('is-hidden');
            if (typeof window.vbfCartOnUserLoggedOut === 'function') window.vbfCartOnUserLoggedOut();
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
                setLoginModalMode('login');
                if (loginModal) loginModal.classList.remove('is-hidden');
            }
        });
    }

    document.getElementById('linkToRegister')?.addEventListener('click', (e) => { e.preventDefault(); setLoginModalMode('register'); });
    document.getElementById('linkToLogin')?.addEventListener('click', (e) => { e.preventDefault(); setLoginModalMode('login'); });
    document.getElementById('btnCloudLoginPrompt')?.addEventListener('click', () => {
        setLoginModalMode('login');
        if (loginModal) loginModal.classList.remove('is-hidden');
    });

    const btnSubmitRegister = document.getElementById('btnSubmitRegister');
    if (btnSubmitRegister) {
        btnSubmitRegister.addEventListener('click', async () => {
            const regUser = document.getElementById('regUser')?.value?.trim();
            const regEmail = document.getElementById('regEmail')?.value?.trim();
            const regCompany = document.getElementById('regCompany')?.value?.trim();
            const regPass = document.getElementById('regPass')?.value;
            const regMarketing = document.getElementById('regMarketing')?.checked;
            const registerError = document.getElementById('registerError');
            if (registerError) registerError.textContent = '';
            if (!regUser || !regEmail || !regPass) {
                if (registerError) registerError.textContent = 'Felhasználónév, e-mail és jelszó kötelező.';
                return;
            }
            const base = window.API_BASE_URL || '';
            let inviteTok = null;
            try {
                inviteTok = sessionStorage.getItem('vbf_reg_invite');
            } catch (e) { /* ignore */ }
            btnSubmitRegister.disabled = true;
            try {
                const payload = {
                    username: regUser,
                    email: regEmail,
                    password: regPass,
                    company_name: regCompany || null,
                    marketing_opt_in: !!regMarketing
                };
                if (inviteTok) payload.invite_token = inviteTok;
                const res = await fetch(`${base}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    let msg = 'Regisztráció sikertelen.';
                    if (typeof data.detail === 'string') msg = data.detail;
                    else if (Array.isArray(data.detail)) {
                        msg = data.detail.map((x) => (x.msg || JSON.stringify(x))).join(' ');
                    }
                    if (registerError) registerError.textContent = msg;
                    return;
                }
                const token = await API.login(regUser, regPass);
                window.currentToken = token;
                window.currentUser = regUser;
                localStorage.setItem('vbf_token', window.currentToken);
                localStorage.setItem('vbf_user', window.currentUser);
                updateAuthUI();
                if (loginModal) loginModal.classList.add('is-hidden');
                try {
                    sessionStorage.removeItem('vbf_reg_invite');
                    const re = document.getElementById('regEmail');
                    if (re) {
                        re.readOnly = false;
                        re.removeAttribute('aria-readonly');
                    }
                } catch (e2) { /* ignore */ }
                if (window.showToast) window.showToast('Sikeres regisztráció!', 'success');
            } catch (err) {
                if (registerError) registerError.textContent = err.message || 'Hiba.';
            } finally {
                btnSubmitRegister.disabled = false;
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
                passwordModal.classList.remove('is-hidden');
            }
        });
    }
    if (btnPasswordClose) {
        btnPasswordClose.addEventListener('click', () => {
            if (passwordModal) passwordModal.classList.add('is-hidden');
            if (passwordModalError) passwordModalError.textContent = '';
        });
    }
    document.getElementById('expiryBannerDismiss')?.addEventListener('click', () => {
        sessionStorage.setItem('vbf_expiry_banner_dismissed', '1');
        var b = document.getElementById('expiryBanner');
        if (b) b.classList.add('is-hidden');
    });
    document.getElementById('pdfWatermarkBannerDismiss')?.addEventListener('click', () => {
        sessionStorage.setItem('vbf_pdf_wm_banner_dismissed', '1');
        var b = document.getElementById('pdfWatermarkBanner');
        if (b) b.classList.add('is-hidden');
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
        if (profileModal) profileModal.classList.remove('is-hidden');
    });
    document.getElementById('btnProfileClose')?.addEventListener('click', () => { if (profileModal) profileModal.classList.add('is-hidden'); });
    profileModal?.addEventListener('click', function (e) { if (e.target === profileModal) profileModal.classList.add('is-hidden'); });
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
                if (window.showToast) window.showToast('E-mail mentve.', 'success');
            } else {
                var data = await res.json().catch(function () { return {}; });
                if (window.showToast) window.showToast(data.detail || 'Hiba történt.', 'error');
            }
        } catch (err) {
            if (window.showToast) window.showToast('Hiba történt.', 'error');
        }
    });
    document.getElementById('btnProfileChangePassword')?.addEventListener('click', () => {
        if (profileModal) profileModal.classList.add('is-hidden');
        if (passwordModal) {
            document.getElementById('passwordCurrent').value = '';
            document.getElementById('passwordNew').value = '';
            document.getElementById('passwordNewConfirm').value = '';
            passwordModal.classList.remove('is-hidden');
        }
    });
    document.getElementById('btnProfileExportZip')?.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('linkDataExportZip')?.click();
    });
    document.getElementById('linkDeleteAccountFromProfile')?.addEventListener('click', function (e) {
        e.preventDefault();
        if (profileModal) profileModal.classList.add('is-hidden');
        document.getElementById('linkDeleteAccount')?.click();
    });
    var forgotPasswordModal = document.getElementById('forgotPasswordModal');
    document.getElementById('linkForgotPassword')?.addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('forgotPasswordEmail').value = '';
        document.getElementById('forgotPasswordStatus').textContent = '';
        if (forgotPasswordModal) forgotPasswordModal.classList.remove('is-hidden');
    });
    document.getElementById('btnForgotPasswordClose')?.addEventListener('click', () => { if (forgotPasswordModal) forgotPasswordModal.classList.add('is-hidden'); });
    forgotPasswordModal?.addEventListener('click', function (e) { if (e.target === forgotPasswordModal) forgotPasswordModal.classList.add('is-hidden'); });
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
            if (res.ok && forgotPasswordModal) forgotPasswordModal.classList.add('is-hidden');
        } catch (err) {
            if (statusEl) statusEl.textContent = 'Hálózati hiba.';
        }
    });
    var resetToken = new URLSearchParams(window.location.search).get('reset');
    if (resetToken) {
        var resetPanel = document.getElementById('resetPasswordPanel');
        if (resetPanel) resetPanel.classList.remove('is-hidden');
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
                    if (resetPanel) resetPanel.classList.add('is-hidden');
                } else {
                    if (errEl) errEl.textContent = data.detail || 'Hiba';
                }
            } catch (err) {
                if (errEl) errEl.textContent = 'Hálózati hiba.';
            }
        });
    }
    if (passwordModal && passwordModal.addEventListener) {
        passwordModal.addEventListener('click', (e) => { if (e.target === passwordModal) passwordModal.classList.add('is-hidden'); });
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
                    if (passwordModal) passwordModal.classList.add('is-hidden');
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
            const msg = 'Fiók törlése előtt érdemes letölteni az adataidat (jegyzőkönyvek, fényképek).\n\nLetöltöd most a teljes adatcsomagot (ZIP)? Ha nem, közvetlenül a törlés megerősítésére ugrunk.';
            const choice = confirm(msg);
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
            if (!confirm('Biztosan törlöd a fiókodat? A jegyzőkönyvek és minden adat véglegesen törlődnek; ez nem vonható vissza.')) return;
            if (!confirm('Utolsó megerősítés: véglegesen töröljük a fiókot?')) return;
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

    function closeLoginModal() {
        if (loginModal) loginModal.classList.add('is-hidden');
        if (loginError) loginError.innerText = '';
        const re = document.getElementById('registerError');
        if (re) re.textContent = '';
    }
    if (btnCloseLogin) btnCloseLogin.addEventListener('click', closeLoginModal);
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) closeLoginModal();
        });
    }

    if (btnSubmitLogin) {
        btnSubmitLogin.addEventListener('click', async () => {
            const username = document.getElementById('loginUser').value;
            const password = document.getElementById('loginPass').value;

            if (!username || !password) {
                if (loginError) loginError.innerText = 'Add meg a felhasználónevet és a jelszót.';
                return;
            }

            try {
                const token = await API.login(username, password);

                window.currentToken = token;
                window.currentUser = username;

                localStorage.setItem('vbf_token', window.currentToken);
                localStorage.setItem('vbf_user', window.currentUser);

                updateAuthUI();
                if (loginModal) loginModal.classList.add('is-hidden');
                if (loginError) loginError.innerText = '';
            } catch (error) {
                console.error("Login hiba:", error);
                if (loginError) loginError.innerText = error.message;
            }
        });
    }

    window.deleteMyAccount = async function () {
        if (!confirm('Minden adatod és jegyzőkönyved véglegesen törlődik. Nincs visszaút. Folytatod?')) return;
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
    const urlInviteToken = params.get('invite');
    const urlInviteEmail = params.get('email');
    try {
        if (params.get('register') === '1' && !urlInviteToken) {
            sessionStorage.removeItem('vbf_reg_invite');
        }
        if (urlInviteToken) {
            sessionStorage.setItem('vbf_reg_invite', urlInviteToken);
        }
    } catch (e) { /* ignore */ }
    if (!window.currentToken && (params.get('from') === 'landing' || params.get('register') === '1')) {
        setLoginModalMode(params.get('register') === '1' ? 'register' : 'login');
        if (loginModal) loginModal.classList.remove('is-hidden');
        if (params.get('register') === '1' && urlInviteEmail) {
            const re = document.getElementById('regEmail');
            if (re) {
                try {
                    re.value = decodeURIComponent(urlInviteEmail);
                } catch (e2) {
                    re.value = urlInviteEmail;
                }
                re.readOnly = true;
                re.setAttribute('aria-readonly', 'true');
            }
        }
        history.replaceState({}, '', window.location.pathname);
    }
    // Cookie banner (app oldal): ha még nincs elfogadva, megjelenítés + Elfogadom
    (function () {
        const banner = document.getElementById('cookieBanner');
        const accept = document.getElementById('cookieBannerAccept');
        const privacyLink = document.getElementById('cookieBannerPrivacyLink');
        const legalBase = (window.API_BASE_URL || window.location.origin + '/api').replace(/\/api$/, '') + '/api';
        if (privacyLink) privacyLink.href = legalBase + '/legal/privacy';
        const linkRegTerms = document.getElementById('linkRegTerms');
        const linkRegAszf = document.getElementById('linkRegAszf');
        if (linkRegTerms) linkRegTerms.href = legalBase + '/legal/terms';
        if (linkRegAszf) linkRegAszf.href = legalBase + '/legal/aszf';
        if (banner && !localStorage.getItem('cookie_consent')) banner.classList.remove('is-hidden');
        if (accept) accept.addEventListener('click', () => { localStorage.setItem('cookie_consent', '1'); if (banner) banner.classList.add('is-hidden'); });
    })();

    // Sikeres vásárlás visszatérés: csak ha a backend paid=true, üzenet, majd URL tisztítása
    if (params.has('session_id')) {
        const sid = params.get('session_id');
        const base = window.API_BASE_URL || window.location.origin;
        fetch(`${base}/api/payments/session-status?session_id=${encodeURIComponent(sid)}`)
            .then(r => r.json())
            .then(data => {
                if (data && data.paid) {
                    if (window.showToast) window.showToast('Sikeres vásárlás! A belépési adatokat e-mailben küldtük.', 'success');
                    else if (typeof alert === 'function') alert('Sikeres vásárlás! A belépési adatokat e-mailben küldtük.');
                }
                history.replaceState({}, '', window.location.pathname);
            })
            .catch(() => { history.replaceState({}, '', window.location.pathname); });
    }

    return {
        updateAuthUI
    };
}
