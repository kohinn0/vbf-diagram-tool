export function initAdmin() {
    /** Me (role, company_id, company_name) – admin tab láthatóság és dropdownokhoz */
    window.fetchAdminMe = async function () {
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/users/me`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (res.ok) {
                const me = await res.json();
                window.currentUserRole = me.role || '';
                window.currentUserCompanyId = me.company_id || null;
                window.currentUserCompanyName = me.company_name || '';
                return me;
            }
        } catch (e) { console.error(e); }
        return null;
    };

    const isSuperAdmin = () => window.currentUserRole === 'ADMIN' || window.currentUserRole === 'SUPER_ADMIN';

    window.fetchCompanySettings = async function () {
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/company`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                document.getElementById('adminCompName').value = data.company_name || '';
                document.getElementById('adminCompTax').value = data.tax_number || '';
                document.getElementById('adminCompAddress').value = data.address || '';
                document.getElementById('adminCompBank').value = data.bank_account || '';

                if (data.logo_path) {
                    const img = document.getElementById('adminCompLogoPreview');
                    img.src = `${window.API_BASE_URL.replace('/api', '')}/${data.logo_path}`;
                    img.classList.remove('is-hidden');
                }
                if (data.signature_path) {
                    const sigImg = document.getElementById('adminCompSignaturePreview');
                    if (sigImg) {
                        sigImg.src = `${window.API_BASE_URL.replace('/api', '')}/${data.signature_path}`;
                        sigImg.classList.remove('is-hidden');
                    }
                }
                const certStatus = document.getElementById('adminCompCertStatus');
                if (certStatus) certStatus.textContent = data.pfx_path ? '✓ Feltöltött tanúsítvány (.pfx)' : 'Nincs feltöltött tanúsítvány';
            }
        } catch (e) {
            console.error("Nem sikerült betölteni a céges adatokat", e);
        }
    };

    const btnAdminSaveCompany = document.getElementById('btnAdminSaveCompany');
    if (btnAdminSaveCompany) {
        btnAdminSaveCompany.addEventListener('click', async () => {
            const data = {
                company_name: document.getElementById('adminCompName').value,
                tax_number: document.getElementById('adminCompTax').value,
                address: document.getElementById('adminCompAddress').value,
                bank_account: document.getElementById('adminCompBank').value
            };
            try {
                const res = await fetch(`${window.API_BASE_URL}/api/admin/company`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${window.currentToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    alert('Céges adatok sikeresen elmentve!');
                } else {
                    alert('Hiba történt a mentés során.');
                }
            } catch (e) {
                alert('Hálózati hiba: ' + e.message);
            }
        });
    }

    const btnAdminUploadLogo = document.getElementById('btnAdminUploadLogo');
    const adminCompLogoInput = document.getElementById('adminCompLogoInput');

    if (btnAdminUploadLogo && adminCompLogoInput) {
        btnAdminUploadLogo.addEventListener('click', () => {
            adminCompLogoInput.click();
        });

        adminCompLogoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await fetch(`${window.API_BASE_URL}/api/admin/company/logo`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${window.currentToken}`
                    },
                    body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    const img = document.getElementById('adminCompLogoPreview');
                    img.src = `${window.API_BASE_URL.replace('/api', '')}/${data.logo_path}?t=${new Date().getTime()}`;
                    img.classList.remove('is-hidden');
                    alert('Logó sikeresen feltöltve!');
                } else {
                    alert('Hiba történt a logó feltöltésekor.');
                }
            } catch (err) {
                alert('Hálózati hiba: ' + err.message);
            }
        });
    }

    const btnAdminUploadSignature = document.getElementById('btnAdminUploadSignature');
    const adminCompSignatureInput = document.getElementById('adminCompSignatureInput');
    if (btnAdminUploadSignature && adminCompSignatureInput) {
        btnAdminUploadSignature.addEventListener('click', () => adminCompSignatureInput.click());
        adminCompSignatureInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await fetch(`${window.API_BASE_URL}/api/admin/company/signature`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${window.currentToken}` },
                    body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    const img = document.getElementById('adminCompSignaturePreview');
                    if (img) {
                        img.src = `${window.API_BASE_URL.replace('/api', '')}/${data.signature_path}?t=${Date.now()}`;
                        img.classList.remove('is-hidden');
                    }
                    if (window.showToast) window.showToast('Aláírás feltöltve!', 'success'); else alert('Aláírás feltöltve!');
                } else {
                    const d = await res.json();
                    if (window.showToast) window.showToast(d.detail || 'Hiba', 'error'); else alert(d.detail || 'Hiba');
                }
            } catch (err) {
                if (window.showToast) window.showToast(err.message, 'error'); else alert('Hálózati hiba: ' + err.message);
            }
            adminCompSignatureInput.value = '';
        });
    }

    const btnAdminUploadCert = document.getElementById('btnAdminUploadCert');
    const adminCompCertInput = document.getElementById('adminCompCertInput');
    if (btnAdminUploadCert && adminCompCertInput) {
        btnAdminUploadCert.addEventListener('click', () => adminCompCertInput.click());
        adminCompCertInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const fn = (file.name || '').toLowerCase();
            if (!fn.endsWith('.pfx') && !fn.endsWith('.p12')) {
                if (window.showToast) window.showToast('Csak .pfx vagy .p12 fájl tölthető fel.', 'error');
                else alert('Csak .pfx vagy .p12 fájl tölthető fel.');
                adminCompCertInput.value = '';
                return;
            }
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await fetch(`${window.API_BASE_URL}/api/admin/company/cert`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${window.currentToken}` },
                    body: formData
                });
                const data = await res.json().catch(() => ({}));
                if (res.ok) {
                    const certStatus = document.getElementById('adminCompCertStatus');
                    if (certStatus) certStatus.textContent = '✓ Feltöltött tanúsítvány (.pfx)';
                    if (window.showToast) window.showToast(data.message || 'Tanúsítvány feltöltve.', 'success');
                    else alert(data.message || 'Tanúsítvány feltöltve.');
                } else {
                    if (window.showToast) window.showToast(data.detail || 'Hiba', 'error');
                    else alert(data.detail || 'Hiba');
                }
            } catch (err) {
                if (window.showToast) window.showToast(err.message, 'error');
                else alert('Hálózati hiba: ' + err.message);
            }
            adminCompCertInput.value = '';
        });
    }

    window.fetchAdminUsers = async function () {
        const list = document.getElementById('adminUserList');
        if (!list) return;
        await window.fetchAdminMe();
        const roleLabels = { TECH: 'Villanyszerelő', COMPANY_ADMIN: 'Céges vezető', ADMIN: 'Főadmin', SUPER_ADMIN: 'Főadmin' };
        const roleOpts = (u) => {
            let opts = '<option value="TECH" ' + (u.role === 'TECH' ? 'selected' : '') + '>Villanyszerelő</option><option value="COMPANY_ADMIN" ' + (u.role === 'COMPANY_ADMIN' ? 'selected' : '') + '>Céges vezető</option>';
            if (isSuperAdmin()) opts += '<option value="ADMIN" ' + ((u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') ? 'selected' : '') + '>Főadmin</option>';
            return opts;
        };
        const companiesSection = document.getElementById('adminCompaniesSection');
        const plansSection = document.getElementById('adminPlansSection');
        const pendingOrdersSection = document.getElementById('adminPendingOrdersSection');
        const companyWrap = document.getElementById('adminNewCompanyWrap');
        const roleSelect = document.getElementById('adminNewRole');
        if (companiesSection) companiesSection.classList.toggle('is-hidden', !isSuperAdmin());
        if (plansSection) plansSection.classList.toggle('is-hidden', !isSuperAdmin());
        if (pendingOrdersSection) pendingOrdersSection.classList.toggle('is-hidden', !isSuperAdmin());
        const dijbekeroSection = document.getElementById('adminDijbekeroSection');
        if (dijbekeroSection) dijbekeroSection.classList.toggle('is-hidden', !isSuperAdmin());
        if (isSuperAdmin()) {
            window.fetchAdminCompanies();
            if (window.fetchAdminPlans) window.fetchAdminPlans();
            if (window.fetchAdminPendingOrders) window.fetchAdminPendingOrders();
            if (window.fetchAdminPaymentHistory) window.fetchAdminPaymentHistory();
            if (window.loadAdminDijbekeroPresets) window.loadAdminDijbekeroPresets();
        }
        if (companyWrap) companyWrap.classList.add('is-hidden');
        if (roleSelect) {
            roleSelect.innerHTML = '<option value="TECH">Villanyszerelő</option><option value="COMPANY_ADMIN">Céges vezető</option>';
            if (isSuperAdmin()) roleSelect.innerHTML += '<option value="ADMIN">Főadmin</option>';
        }
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (!res.ok) {
                list.innerHTML = '<tr><td colspan="8">Hiba a felhasználók lekérdezése közben.</td></tr>';
                return;
            }
            const users = await res.json();
            if (!Array.isArray(users)) return;
            list.innerHTML = '';

            const jobAssignSelect = document.getElementById('adminJobAssignSelect');
            if (jobAssignSelect) jobAssignSelect.innerHTML = '<option value="">-- Válassz kollégát --</option>';

            users.forEach(u => {
                if (jobAssignSelect) {
                    const opt = document.createElement('option');
                    opt.value = u.id;
                    opt.text = u.username + ' (' + (roleLabels[u.role] || u.role) + ')';
                    jobAssignSelect.appendChild(opt);
                }
                const tr = document.createElement('tr');
                const expiry = u.subscription_expires ? new Date(u.subscription_expires).toISOString().split('T')[0] : '';
                const safeEmail = (u.email || '').replace(/"/g, '&quot;');
                const safeCompany = (u.company_name || '').replace(/</g, '&lt;');
                tr.innerHTML = '<td>' + u.id + '</td><td>' + u.username + '</td><td><input type="email" class="vbf-admin-user-email" value="' + safeEmail + '" onchange="updateUser(' + u.id + ', {email: this.value})" placeholder="e-mail@pelda.hu" autocomplete="email"></td><td><select onchange="updateUser(' + u.id + ', {is_active: this.value === \'active\'})"><option value="active" ' + (u.is_active ? 'selected' : '') + '>Aktív</option><option value="inactive" ' + (!u.is_active ? 'selected' : '') + '>Tiltott</option></select></td><td><select onchange="updateUser(' + u.id + ', {role: this.value})">' + roleOpts(u) + '</select></td><td>' + safeCompany + '</td><td><input type="date" value="' + expiry + '" onchange="updateUser(' + u.id + ', {subscription_expires: this.value})"></td><td><button type="button" class="btn btn-danger btn-small vbf-admin-user-delete" onclick="deleteUser(' + u.id + ')">Törlés</button></td>';
                list.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    };

    document.getElementById('adminNewRole')?.addEventListener('change', async function () {
        const wrap = document.getElementById('adminNewCompanyWrap');
        const sel = document.getElementById('adminNewCompanyId');
        const role = this.value;
        if (!isSuperAdmin() || !wrap || !sel) return;
        if (role === 'TECH' || role === 'COMPANY_ADMIN') {
            wrap.classList.remove('is-hidden');
            if (sel.options.length <= 1) {
                try {
                    const r = await fetch(`${window.API_BASE_URL}/api/admin/companies`, { headers: { 'Authorization': `Bearer ${window.currentToken}` } });
                    if (r.ok) {
                        const companies = await r.json();
                        sel.innerHTML = '<option value="">-- Válassz céget --</option>';
                        companies.forEach(c => { sel.appendChild(new Option(c.name, c.id)); });
                    }
                } catch (e) { console.error(e); }
            }
        } else { wrap.classList.add('is-hidden'); }
    });

    window.fetchAdminCompanies = async function () {
        if (!isSuperAdmin()) return [];
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/companies`, { headers: { 'Authorization': `Bearer ${window.currentToken}` } });
            if (!res.ok) return [];
            const companies = await res.json();
            const listEl = document.getElementById('adminCompaniesList');
            const sel = document.getElementById('adminNewCompanyId');
            if (listEl) listEl.textContent = companies.length ? ('Cégek: ' + companies.map(c => c.name).join(', ')) : 'Még nincs cég. Hozz létre egyet alább.';
            if (sel && sel.options.length <= 1) {
                sel.innerHTML = '<option value="">-- Válassz céget --</option>';
                companies.forEach(c => sel.appendChild(new Option(c.name, c.id)));
            }
            return companies;
        } catch (e) { return []; }
    };
    document.getElementById('btnAdminCreateCompany')?.addEventListener('click', async () => {
        const nameEl = document.getElementById('adminNewCompanyName');
        const name = nameEl?.value?.trim();
        if (!name) { if (window.showToast) window.showToast('Add meg a cég nevét!', 'error'); else alert('Add meg a cég nevét!'); return; }
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/companies`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${window.currentToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                if (window.showToast) window.showToast('Cég létrehozva.', 'success'); else alert('Cég létrehozva.');
                nameEl.value = '';
                await window.fetchAdminCompanies();
            } else {
                const d = await res.json();
                if (window.showToast) window.showToast(d.detail || 'Hiba', 'error'); else alert(d.detail || 'Hiba');
            }
        } catch (e) { if (window.showToast) window.showToast(e.message, 'error'); else alert(e.message); }
    });

    // ─── Előfizetési csomagok (ár, tartalom) ───
    window.fetchAdminPlans = async function () {
        if (!isSuperAdmin()) return;
        const listEl = document.getElementById('adminPlansList');
        if (!listEl) return;
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/plans`, { headers: { 'Authorization': `Bearer ${window.currentToken}` } });
            if (!res.ok) { listEl.innerHTML = '<p class="vbf-admin-muted-p">Nem sikerült betölteni a csomagokat.</p>'; return; }
            const plans = await res.json();
            listEl.innerHTML = '';
            plans.forEach(p => {
                const card = document.createElement('div');
                card.className = 'vbf-admin-plan-card';
                const priceParts = [];
                if (p.price_monthly != null && p.price_monthly !== '') priceParts.push(Number(p.price_monthly) + ' Ft/hó');
                if (p.price_yearly != null && p.price_yearly !== '') priceParts.push(Number(p.price_yearly) + ' Ft/év');
                const priceHtml = priceParts.length
                    ? '<div class="vbf-admin-plan-price">' + priceParts.join('<span aria-hidden="true"> · </span>') + '</div>'
                    : '<div class="vbf-admin-plan-price vbf-admin-plan-price--muted">Nincs megadott ár</div>';
                const repLim = p.reports_per_month_limit != null ? p.reports_per_month_limit + ' jegyzőkönyv/hó' : 'Korlátlan jegyzőkönyv/hó';
                const userLim = p.max_users != null ? p.max_users + ' felhasználó' : 'Korlátlan felhasználó';
                const feats = Array.isArray(p.features) && p.features.length
                    ? '<ul class="vbf-admin-plan-features">' + p.features.map(f => '<li>' + String(f).replace(/</g, '&lt;') + '</li>').join('') + '</ul>'
                    : '<ul class="vbf-admin-plan-features vbf-admin-plan-features--empty"><li class="vbf-admin-plan-price--muted">Nincs felsorolt funkció</li></ul>';
                card.innerHTML = '<div class="vbf-admin-plan-card-title">' + String(p.display_name).replace(/</g, '&lt;') + '</div>' +
                    priceHtml +
                    '<div class="vbf-admin-plan-limits">' + repLim + '<br>' + userLim + '</div>' +
                    feats +
                    '<button type="button" class="btn btn-primary btn-small">Szerkesztés</button>';
                const btn = card.querySelector('button');
                btn.addEventListener('click', () => window.openPlanModal(p));
                listEl.appendChild(card);
            });
        } catch (e) {
            listEl.innerHTML = '<p class="vbf-admin-muted-p">Hiba: ' + String(e.message) + '</p>';
        }
    };

    const planModal = document.getElementById('adminPlanModal');
    window.openPlanModal = function (plan) {
        if (!planModal) return;
        document.getElementById('adminPlanModalKey').value = plan.plan_key;
        document.getElementById('adminPlanModalTitle').textContent = plan.display_name || plan.plan_key;
        document.getElementById('adminPlanDisplayName').value = plan.display_name || '';
        document.getElementById('adminPlanPriceMonthly').value = plan.price_monthly != null ? plan.price_monthly : '';
        document.getElementById('adminPlanPriceYearly').value = plan.price_yearly != null ? plan.price_yearly : '';
        document.getElementById('adminPlanReportsLimit').value = plan.reports_per_month_limit != null ? plan.reports_per_month_limit : '';
        document.getElementById('adminPlanMaxUsers').value = plan.max_users != null ? plan.max_users : '';
        document.getElementById('adminPlanFeatures').value = Array.isArray(plan.features) ? plan.features.join('\n') : '';
        planModal.classList.remove('is-hidden');
    };

    document.getElementById('adminPlanModalCancel')?.addEventListener('click', () => { if (planModal) planModal.classList.add('is-hidden'); });
    planModal?.addEventListener('click', (e) => { if (e.target === planModal) planModal.classList.add('is-hidden'); });
    document.getElementById('adminPlanModalSave')?.addEventListener('click', async () => {
        const key = document.getElementById('adminPlanModalKey').value;
        if (!key) return;
        const displayName = document.getElementById('adminPlanDisplayName').value.trim();
        const rawMon = document.getElementById('adminPlanPriceMonthly').value.trim();
        const rawYr = document.getElementById('adminPlanPriceYearly').value.trim();
        const rawRep = document.getElementById('adminPlanReportsLimit').value.trim();
        const rawUsr = document.getElementById('adminPlanMaxUsers').value.trim();
        const featuresText = document.getElementById('adminPlanFeatures').value.trim();
        const payload = {
            display_name: displayName || null,
            price_monthly: rawMon === '' ? null : parseInt(rawMon, 10),
            price_yearly: rawYr === '' ? null : parseInt(rawYr, 10),
            reports_per_month_limit: rawRep === '' ? null : parseInt(rawRep, 10),
            max_users: rawUsr === '' ? null : parseInt(rawUsr, 10),
            features: featuresText ? featuresText.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : []
        };
        if (isNaN(payload.price_monthly)) payload.price_monthly = null;
        if (isNaN(payload.price_yearly)) payload.price_yearly = null;
        if (isNaN(payload.reports_per_month_limit)) payload.reports_per_month_limit = null;
        if (isNaN(payload.max_users)) payload.max_users = null;
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/plans/${encodeURIComponent(key)}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${window.currentToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                if (window.showToast) window.showToast('Csomag mentve.', 'success'); else alert('Csomag mentve.');
                planModal.classList.add('is-hidden');
                await window.fetchAdminPlans();
            } else {
                const d = await res.json();
                if (window.showToast) window.showToast(d.detail || 'Hiba', 'error'); else alert(d.detail || 'Hiba');
            }
        } catch (e) {
            if (window.showToast) window.showToast(e.message, 'error'); else alert(e.message);
        }
    });

    window.fetchAdminPendingOrders = async function () {
        if (!isSuperAdmin()) return;
        const listEl = document.getElementById('adminPendingOrdersList');
        if (!listEl) return;
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/pending-orders`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (!res.ok) { listEl.innerHTML = '<p class="vbf-admin-muted-p">Nem sikerült betölteni a megrendeléseket.</p>'; return; }
            const orders = await res.json();
            if (!orders || orders.length === 0) {
                listEl.innerHTML = '<p class="vbf-admin-muted-p">Nincs függő megrendelés.</p>';
                return;
            }
            listEl.innerHTML = '<table class="data-table vbf-admin-table-wrap"><thead><tr><th>E-mail</th><th>Név</th><th>Csomag</th><th>Összeg</th><th>Dátum</th><th></th></tr></thead><tbody></tbody></table>';
            const tbody = listEl.querySelector('tbody');
            orders.forEach(o => {
                const tr = document.createElement('tr');
                const created = o.created_at ? new Date(o.created_at).toLocaleDateString('hu-HU') : '';
                tr.innerHTML = '<td>' + String(o.email).replace(/</g, '&lt;') + '</td><td>' + String(o.customer_name || '').replace(/</g, '&lt;') + '</td><td>' + (o.plan_type === 'monthly' ? 'Havi előfizetés' : 'Éves előfizetés') + '</td><td>' + (o.amount_huf || 0) + ' Ft</td><td>' + created + '</td><td><button type="button" class="btn btn-primary btn-small" data-order-id="' + o.id + '">Megrendelés jóváhagyása</button></td>';
                tr.querySelector('button').addEventListener('click', async () => {
                    const id = tr.querySelector('button').getAttribute('data-order-id');
                    if (!id || !confirm('Utalás jóváhagyása: a vásárló megkapja a hozzáférési e-mailt. Folytatod?')) return;
                    try {
                        const r = await fetch(`${window.API_BASE_URL}/api/admin/pending-orders/${id}/mark-paid`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${window.currentToken}` }
                        });
                        if (r.ok) {
                            if (window.showToast) window.showToast('Hozzáférés aktiválva, értesítő e-mail elküldve.', 'success'); else alert('Hozzáférés aktiválva.');
                            await window.fetchAdminPendingOrders();
                        } else {
                            const d = await r.json();
                            if (window.showToast) window.showToast(d.detail || 'Hiba', 'error'); else alert(d.detail || 'Hiba');
                        }
                    } catch (e) {
                        if (window.showToast) window.showToast(e.message, 'error'); else alert(e.message);
                    }
                });
                tbody.appendChild(tr);
            });
        } catch (e) {
            listEl.innerHTML = '<p class="vbf-admin-muted-p">Hiba: ' + String(e.message) + '</p>';
        }
    };

    window.fetchAdminPaymentHistory = async function () {
        if (!isSuperAdmin()) return;
        const listEl = document.getElementById('adminPaymentHistoryList');
        const sectionEl = document.getElementById('adminPaymentHistorySection');
        if (!listEl || !sectionEl) return;
        sectionEl.classList.remove('is-hidden');
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/payment-history`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (!res.ok) { listEl.innerHTML = '<p class="vbf-admin-muted-p">Nem sikerült betölteni az előzményeket.</p>'; return; }
            const logs = await res.json();
            if (!logs || logs.length === 0) {
                listEl.innerHTML = '<p class="vbf-admin-muted-p">Még nincs rögzített vásárlás.</p>';
                return;
            }
            listEl.innerHTML = '<table class="data-table vbf-admin-table-wrap"><thead><tr><th>Dátum</th><th>E-mail</th><th>Név</th><th>Csomag</th><th>Összeg</th><th>Fizetés</th><th>Státusz</th><th></th></tr></thead><tbody></tbody></table>';
            const tbody = listEl.querySelector('tbody');
            logs.forEach(log => {
                const tr = document.createElement('tr');
                const created = log.created_at ? new Date(log.created_at).toLocaleString('hu-HU') : '';
                const method = log.payment_method === 'stripe' ? 'Kártya' : 'Utalás';
                const status = log.status === 'refunded' ? 'Visszatérítve' : 'Teljesítve';
                const canRefund = log.payment_method === 'stripe' && log.status === 'completed';
                let actionCell = '';
                if (canRefund) {
                    actionCell = '<button type="button" class="btn btn-danger btn-small" data-log-id="' + log.id + '">Visszatérítés</button>';
                }
                tr.innerHTML = '<td>' + created + '</td><td>' + String(log.email).replace(/</g, '&lt;') + '</td><td>' + String(log.customer_name || '').replace(/</g, '&lt;') + '</td><td>' + (log.plan_type === 'monthly' ? 'Havi előfizetés' : 'Éves előfizetés') + '</td><td>' + (log.amount_huf || 0) + ' Ft</td><td>' + method + '</td><td>' + status + '</td><td>' + actionCell + '</td>';
                const btn = tr.querySelector('button');
                if (btn) {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-log-id');
                        if (!id || !confirm('Visszatérítés: a Stripe-ban visszatérítés történik, a hozzáférés visszavonásra kerül. Folytatod?')) return;
                        try {
                            const r = await fetch(`${window.API_BASE_URL}/api/admin/payment-logs/${id}/refund`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${window.currentToken}` }
                            });
                            if (r.ok) {
                                if (window.showToast) window.showToast('Visszatérítés elküldve, hozzáférés visszavonva.', 'success'); else alert('Kész.');
                                await window.fetchAdminPaymentHistory();
                            } else {
                                const d = await r.json();
                                if (window.showToast) window.showToast(d.detail || 'Hiba', 'error'); else alert(d.detail || 'Hiba');
                            }
                        } catch (e) {
                            if (window.showToast) window.showToast(e.message, 'error'); else alert(e.message);
                        }
                    });
                }
                tbody.appendChild(tr);
            });
        } catch (e) {
            listEl.innerHTML = '<p class="vbf-admin-muted-p">Hiba: ' + String(e.message) + '</p>';
        }
    };

    const DIJBEKERO_STORAGE_KEY = 'dijbekero_last';
    const saveDijbekeroToStorage = (data) => {
        try { localStorage.setItem(DIJBEKERO_STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
    };
    const loadDijbekeroFromStorage = () => {
        try {
            const s = localStorage.getItem(DIJBEKERO_STORAGE_KEY);
            return s ? JSON.parse(s) : null;
        } catch (_) { return null; }
    };

    const dijbekeroFetch = async (sendToEmail) => {
        const amountVal = document.getElementById('dijbekeroAmount')?.value?.trim();
        const amount = amountVal ? parseInt(amountVal, 10) : null;
        const body = {
            amount_huf: (amount != null && !isNaN(amount)) ? amount : null,
            description: document.getElementById('dijbekeroDesc')?.value?.trim() || null,
            due_date: document.getElementById('dijbekeroDue')?.value?.trim() || null,
            vevo_nev: document.getElementById('dijbekeroVevoNev')?.value?.trim() || null,
            vevo_cim: document.getElementById('dijbekeroVevoCim')?.value?.trim() || null,
            send_to_email: sendToEmail || null
        };
        const statusEl = document.getElementById('dijbekeroStatus');
        if (statusEl) statusEl.textContent = sendToEmail ? 'Küldés…' : 'Generálás…';
        const res = await fetch(`${window.API_BASE_URL}/api/admin/dijbekero-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.currentToken}`
            },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            if (statusEl) statusEl.textContent = d.detail || 'Hiba történt.';
            return;
        }
        saveDijbekeroToStorage({
            amount_huf: body.amount_huf,
            description: body.description,
            due_date: body.due_date,
            vevo_nev: body.vevo_nev,
            vevo_cim: body.vevo_cim,
            email: document.getElementById('dijbekeroEmail')?.value?.trim() || ''
        });
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
            const json = await res.json();
            if (statusEl) statusEl.textContent = json.message || 'Elküldve.';
            return;
        }
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'dijbekero.pdf';
        a.click();
        URL.revokeObjectURL(a.href);
        if (statusEl) statusEl.textContent = 'PDF letöltve.';
    };

    document.getElementById('btnDijbekeroPdf')?.addEventListener('click', async () => {
        try { await dijbekeroFetch(null); } catch (e) {
            document.getElementById('dijbekeroStatus').textContent = 'Hiba: ' + String(e.message);
        }
    });

    document.getElementById('btnDijbekeroEmail')?.addEventListener('click', async () => {
        const email = document.getElementById('dijbekeroEmail')?.value?.trim();
        if (!email || !email.includes('@')) {
            const statusEl = document.getElementById('dijbekeroStatus');
            if (statusEl) statusEl.textContent = 'Érvényes e-mail címet adj meg.';
            return;
        }
        try { await dijbekeroFetch(email); } catch (e) {
            document.getElementById('dijbekeroStatus').textContent = 'Hiba: ' + String(e.message);
        }
    });

    document.getElementById('btnDijbekeroDuplikatum')?.addEventListener('click', () => {
        const d = loadDijbekeroFromStorage();
        if (!d) {
            document.getElementById('dijbekeroStatus').textContent = 'Még nincs mentett adat. Először tölts le vagy küldj egy díjbekérőt.';
            return;
        }
        const id = (n) => document.getElementById(n);
        if (id('dijbekeroAmount')) id('dijbekeroAmount').value = d.amount_huf ?? '';
        if (id('dijbekeroDesc')) id('dijbekeroDesc').value = d.description ?? '';
        if (id('dijbekeroDue')) id('dijbekeroDue').value = d.due_date ?? '';
        if (id('dijbekeroVevoNev')) id('dijbekeroVevoNev').value = d.vevo_nev ?? '';
        if (id('dijbekeroVevoCim')) id('dijbekeroVevoCim').value = d.vevo_cim ?? '';
        if (id('dijbekeroEmail')) id('dijbekeroEmail').value = d.email ?? '';
        document.getElementById('dijbekeroStatus').textContent = 'Utolsó adatok betöltve.';
    });

    const loadDijbekeroPresets = async () => {
        const sel = document.getElementById('dijbekeroPresetSelect');
        if (!sel) return;
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/dijbekero-presets`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            const presets = res.ok ? await res.json() : [];
            sel.innerHTML = '<option value="">— Válassz sablont —</option>' +
                presets.map(p => `<option value="${p.id}" data-amount="${p.amount_huf ?? ''}" data-desc="${(p.description || '').replace(/"/g, '&quot;')}">${(p.name || 'Sablon').replace(/</g, '&lt;')}</option>`).join('');
        } catch (_) { sel.innerHTML = '<option value="">— Válassz sablont —</option>'; }
    };

    document.getElementById('dijbekeroPresetSelect')?.addEventListener('change', function () {
        const opt = this.selectedOptions?.[0];
        if (!opt || !opt.value) return;
        const id = (n) => document.getElementById(n);
        if (id('dijbekeroAmount')) id('dijbekeroAmount').value = opt.dataset.amount ?? '';
        if (id('dijbekeroDesc')) id('dijbekeroDesc').value = (opt.dataset.desc || '').replace(/&quot;/g, '"');
    });

    document.getElementById('btnDijbekeroSavePreset')?.addEventListener('click', async () => {
        const name = prompt('Sablon neve:', document.getElementById('dijbekeroDesc')?.value?.trim() || '');
        if (!name || !name.trim()) return;
        const amountVal = document.getElementById('dijbekeroAmount')?.value?.trim();
        const amount = amountVal ? parseInt(amountVal, 10) : null;
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/dijbekero-presets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.currentToken}`
                },
                body: JSON.stringify({
                    name: name.trim(),
                    amount_huf: (amount != null && !isNaN(amount)) ? amount : null,
                    description: document.getElementById('dijbekeroDesc')?.value?.trim() || null
                })
            });
            if (res.ok) {
                await loadDijbekeroPresets();
                document.getElementById('dijbekeroStatus').textContent = 'Sablon mentve.';
            } else {
                document.getElementById('dijbekeroStatus').textContent = 'Hiba a mentés során.';
            }
        } catch (e) {
            document.getElementById('dijbekeroStatus').textContent = 'Hiba: ' + String(e.message);
        }
    });

    if (typeof window.loadAdminDijbekeroPresets === 'undefined') {
        window.loadAdminDijbekeroPresets = loadDijbekeroPresets;
    }

    window.updateUser = async function (id, data) {
        try {
            if (data.subscription_expires !== undefined) {
                if (data.subscription_expires) {
                    data.subscription_expires = new Date(data.subscription_expires).toISOString();
                } else {
                    data.subscription_expires = null;
                }
            }
            const res = await fetch(`${window.API_BASE_URL}/api/admin/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.currentToken}`
                },
                body: JSON.stringify(data)
            });
            if (res.ok) alert('Felhasználó frissítve!');
            else alert('Hiba a frissítés során!');
        } catch (err) { alert(err.message); }
    };

    window.deleteUser = async function (id) {
        if (!confirm('Biztosan törlöd ezt a felhasználót?')) return;
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.currentToken}`
                }
            });
            if (res.ok) {
                alert('Felhasználó törölve!');
                window.fetchAdminUsers();
            } else {
                alert('Hiba a törlés során!');
            }
        } catch (err) { alert(err.message); }
    };

    document.getElementById('btnAdminCreateUser')?.addEventListener('click', async () => {
        const btn = document.getElementById('btnAdminCreateUser');
        const uName = document.getElementById('adminNewUsername').value;
        const uPass = document.getElementById('adminNewPassword').value;
        const uEmail = document.getElementById('adminNewEmail').value;
        const uRole = document.getElementById('adminNewRole').value;
        const errDiv = document.getElementById('adminCreateUserError');

        if (!uName || !uPass) {
            if (errDiv) errDiv.innerText = 'Felhasználónév és jelszó is kötelező!';
            return;
        }

        try {
            btn.disabled = true;
            let url = `${window.API_BASE_URL}/api/admin/users?role=${encodeURIComponent(uRole)}`;
            if (isSuperAdmin() && (uRole === 'TECH' || uRole === 'COMPANY_ADMIN')) {
                const cid = document.getElementById('adminNewCompanyId')?.value;
                if (cid) url += '&company_id=' + encodeURIComponent(cid);
            }
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.currentToken}`
                },
                body: JSON.stringify({ username: uName, password: uPass, email: uEmail || null })
            });

            if (res.ok) {
                alert("Új felhasználó sikeresen létrehozva!");
                document.getElementById('adminNewUsername').value = '';
                document.getElementById('adminNewPassword').value = '';
                if (errDiv) errDiv.innerText = '';
                window.fetchAdminUsers();
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
                if (window.fetchJobs) window.fetchJobs();
            } else {
                alert("Hiba a feladat kiosztásakor!");
            }
        } catch (e) { console.error(e); }
    });
}
