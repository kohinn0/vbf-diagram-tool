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
                const hex = (data.docx_primary_color || '#1e3a5f').replace(/^#?/, '#');
                if (document.getElementById('adminDocxHeader')) document.getElementById('adminDocxHeader').value = data.docx_header_text || '';
                if (document.getElementById('adminDocxFooter')) document.getElementById('adminDocxFooter').value = data.docx_footer_text || '';
                if (document.getElementById('adminDocxColorHex')) document.getElementById('adminDocxColorHex').value = hex;
                if (document.getElementById('adminDocxColor')) document.getElementById('adminDocxColor').value = hex.length === 7 ? hex : '#1e3a5f';
                const embedDiagramEl = document.getElementById('adminDocxEmbedDiagram');
                if (embedDiagramEl) embedDiagramEl.checked = data.docx_embed_diagram !== false && data.docx_embed_diagram !== 0;

                if (data.logo_path) {
                    const img = document.getElementById('adminCompLogoPreview');
                    img.src = `${window.API_BASE_URL.replace('/api', '')}/${data.logo_path}`;
                    img.style.display = 'block';
                }
                if (data.signature_path) {
                    const sigImg = document.getElementById('adminCompSignaturePreview');
                    if (sigImg) {
                        sigImg.src = `${window.API_BASE_URL.replace('/api', '')}/${data.signature_path}`;
                        sigImg.style.display = 'block';
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
            const hexEl = document.getElementById('adminDocxColorHex');
            const colorEl = document.getElementById('adminDocxColor');
            let docxColor = (hexEl && hexEl.value) ? hexEl.value.trim() : '';
            if (docxColor && !docxColor.startsWith('#')) docxColor = '#' + docxColor;
            if (colorEl && colorEl.value && !docxColor) docxColor = colorEl.value;
            const data = {
                company_name: document.getElementById('adminCompName').value,
                tax_number: document.getElementById('adminCompTax').value,
                address: document.getElementById('adminCompAddress').value,
                bank_account: document.getElementById('adminCompBank').value,
                docx_header_text: document.getElementById('adminDocxHeader')?.value?.trim() || null,
                docx_footer_text: document.getElementById('adminDocxFooter')?.value?.trim() || null,
                docx_primary_color: docxColor || null,
                docx_embed_diagram: document.getElementById('adminDocxEmbedDiagram')?.checked !== false
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

    const adminDocxColor = document.getElementById('adminDocxColor');
    const adminDocxColorHex = document.getElementById('adminDocxColorHex');
    if (adminDocxColor && adminDocxColorHex) {
        adminDocxColor.addEventListener('input', () => { adminDocxColorHex.value = adminDocxColor.value; });
        adminDocxColorHex.addEventListener('input', () => {
            const v = adminDocxColorHex.value.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(v) || /^[0-9A-Fa-f]{6}$/.test(v)) adminDocxColor.value = v.startsWith('#') ? v : '#' + v;
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
                    img.style.display = 'block';
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
                        img.style.display = 'block';
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
        if (companiesSection) companiesSection.style.display = isSuperAdmin() ? 'block' : 'none';
        if (plansSection) plansSection.style.display = isSuperAdmin() ? 'block' : 'none';
        if (pendingOrdersSection) pendingOrdersSection.style.display = isSuperAdmin() ? 'block' : 'none';
        if (isSuperAdmin()) {
            window.fetchAdminCompanies();
            if (window.fetchAdminPlans) window.fetchAdminPlans();
            if (window.fetchAdminPendingOrders) window.fetchAdminPendingOrders();
            if (window.fetchAdminPaymentHistory) window.fetchAdminPaymentHistory();
        }
        if (companyWrap) companyWrap.style.display = 'none';
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
                const escH = (s) => (window.VBF && window.VBF.sanitize && window.VBF.sanitize.escHtml) ? window.VBF.sanitize.escHtml(s) : String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                const escA = (s) => (window.VBF && window.VBF.sanitize && window.VBF.sanitize.attr) ? window.VBF.sanitize.attr(s) : String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
                const safeEmail = escA(u.email || '');
                const safeCompany = escH(u.company_name || '');
                const safeUsername = escH(u.username || '');
                tr.innerHTML = '<td>' + u.id + '</td><td>' + safeUsername + '</td><td><input type="email" value="' + safeEmail + '" onchange="updateUser(' + u.id + ', {email: this.value})" style="width:150px;padding:0.2rem;" placeholder="Email"></td><td><select onchange="updateUser(' + u.id + ', {is_active: this.value === \'active\'})"><option value="active" ' + (u.is_active ? 'selected' : '') + '>Aktív</option><option value="inactive" ' + (!u.is_active ? 'selected' : '') + '>Tiltott</option></select></td><td><select onchange="updateUser(' + u.id + ', {role: this.value})">' + roleOpts(u) + '</select></td><td>' + safeCompany + '</td><td><input type="date" value="' + escA(expiry) + '" onchange="updateUser(' + u.id + ', {subscription_expires: this.value})"></td><td><button class="btn btn-danger btn-small" onclick="deleteUser(' + u.id + ')">Törlés</button></td>';
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
            wrap.style.display = 'block';
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
        } else { wrap.style.display = 'none'; }
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
            if (!res.ok) { listEl.innerHTML = '<p style="color:var(--text-muted);">Nem sikerült betölteni a csomagokat.</p>'; return; }
            const plans = await res.json();
            listEl.innerHTML = '';
            plans.forEach(p => {
                const card = document.createElement('div');
                card.style.cssText = 'background: rgba(0,0,0,0.2); border-radius: 10px; padding: 1rem; min-width: 200px; flex: 1; max-width: 280px;';
                const priceMon = p.price_monthly != null ? p.price_monthly + ' Ft/hó' : '–';
                const priceYr = p.price_yearly != null ? p.price_yearly + ' Ft/év' : '';
                const repLim = p.reports_per_month_limit != null ? p.reports_per_month_limit + ' jegyzőkönyv/hó' : 'Korlátlan';
                const userLim = p.max_users != null ? p.max_users + ' felhasználó' : 'Korlátlan';
                const escH = (s) => (window.VBF && window.VBF.sanitize && window.VBF.sanitize.escHtml) ? window.VBF.sanitize.escHtml(s) : String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                const feats = Array.isArray(p.features) && p.features.length ? '<ul style="margin:8px 0 0 0; padding-left:1.2rem; font-size:0.9rem;">' + p.features.map(f => '<li>' + escH(f) + '</li>').join('') + '</ul>' : '';
                card.innerHTML = '<div style="font-weight:bold; color: var(--accent); margin-bottom:6px;">' + escH(p.display_name) + '</div>' +
                    '<div style="font-size:0.95rem;">' + priceMon + (priceYr ? ' · ' + priceYr : '') + '</div>' +
                    '<div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">' + repLim + ' · ' + userLim + '</div>' + feats +
                    '<button type="button" class="btn btn-secondary btn-small" style="margin-top:10px;">Szerkesztés</button>';
                const btn = card.querySelector('button');
                btn.addEventListener('click', () => window.openPlanModal(p));
                listEl.appendChild(card);
            });
        } catch (e) {
            const escH = (s) => (window.VBF && window.VBF.sanitize && window.VBF.sanitize.escHtml) ? window.VBF.sanitize.escHtml(s) : String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            listEl.innerHTML = '<p style="color:var(--text-muted);">Hiba: ' + escH(e.message) + '</p>';
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
        planModal.style.display = 'flex';
    };

    document.getElementById('adminPlanModalCancel')?.addEventListener('click', () => { if (planModal) planModal.style.display = 'none'; });
    planModal?.addEventListener('click', (e) => { if (e.target === planModal) planModal.style.display = 'none'; });
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
                planModal.style.display = 'none';
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
            if (!res.ok) { listEl.innerHTML = '<p style="color:var(--text-muted);">Nem sikerült betölteni a megrendeléseket.</p>'; return; }
            const orders = await res.json();
            if (!orders || orders.length === 0) {
                listEl.innerHTML = '<p style="color:var(--text-muted);">Nincs függő megrendelés.</p>';
                return;
            }
            listEl.innerHTML = '<table class="data-table" style="width:100%"><thead><tr><th>Email</th><th>Név</th><th>Csomag</th><th>Összeg</th><th>Dátum</th><th></th></tr></thead><tbody></tbody></table>';
            const tbody = listEl.querySelector('tbody');
            orders.forEach(o => {
                const tr = document.createElement('tr');
                const created = o.created_at ? new Date(o.created_at).toLocaleDateString('hu-HU') : '';
                const escH = (s) => (window.VBF && window.VBF.sanitize && window.VBF.sanitize.escHtml) ? window.VBF.sanitize.escHtml(s) : String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                tr.innerHTML = '<td>' + escH(o.email) + '</td><td>' + escH(o.customer_name || '') + '</td><td>' + (o.plan_type === 'monthly' ? 'Havi' : 'Éves') + '</td><td>' + (o.amount_huf || 0) + ' Ft</td><td>' + escH(created) + '</td><td><button type="button" class="btn btn-primary btn-small" data-order-id="' + o.id + '">Jóváhagyás</button></td>';
                tr.querySelector('button').addEventListener('click', async () => {
                    const id = tr.querySelector('button').getAttribute('data-order-id');
                    if (!id || !confirm('Utalás jóváhagyása: a vásárló megkapja a hozzáférési emailt. Folytatod?')) return;
                    try {
                        const r = await fetch(`${window.API_BASE_URL}/api/admin/pending-orders/${id}/mark-paid`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${window.currentToken}` }
                        });
                        if (r.ok) {
                            if (window.showToast) window.showToast('Hozzáférés aktiválva, email kiküldve.', 'success'); else alert('Kész.');
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
            const escH = (s) => (window.VBF && window.VBF.sanitize && window.VBF.sanitize.escHtml) ? window.VBF.sanitize.escHtml(s) : String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            listEl.innerHTML = '<p style="color:var(--text-muted);">Hiba: ' + escH(e.message) + '</p>';
        }
    };

    window.fetchAdminPaymentHistory = async function () {
        if (!isSuperAdmin()) return;
        const listEl = document.getElementById('adminPaymentHistoryList');
        const sectionEl = document.getElementById('adminPaymentHistorySection');
        if (!listEl || !sectionEl) return;
        sectionEl.style.display = 'block';
        try {
            const res = await fetch(`${window.API_BASE_URL}/api/admin/payment-history`, {
                headers: { 'Authorization': `Bearer ${window.currentToken}` }
            });
            if (!res.ok) { listEl.innerHTML = '<p style="color:var(--text-muted);">Nem sikerült betölteni az előzményeket.</p>'; return; }
            const logs = await res.json();
            if (!logs || logs.length === 0) {
                listEl.innerHTML = '<p style="color:var(--text-muted);">Még nincs rögzített vásárlás.</p>';
                return;
            }
            listEl.innerHTML = '<table class="data-table" style="width:100%"><thead><tr><th>Dátum</th><th>Email</th><th>Név</th><th>Csomag</th><th>Összeg</th><th>Fizetés</th><th>Státusz</th><th></th></tr></thead><tbody></tbody></table>';
            const tbody = listEl.querySelector('tbody');
            logs.forEach(log => {
                const tr = document.createElement('tr');
                const created = log.created_at ? new Date(log.created_at).toLocaleString('hu-HU') : '';
                const method = log.payment_method === 'stripe' ? 'Kártya' : 'Utalás';
                const status = log.status === 'refunded' ? 'Visszatérítve' : 'Részrehajtva';
                const canRefund = log.payment_method === 'stripe' && log.status === 'completed';
                let actionCell = '';
                if (canRefund) {
                    actionCell = '<button type="button" class="btn btn-danger btn-small" data-log-id="' + log.id + '">Visszatérítés</button>';
                }
                const escH = (s) => (window.VBF && window.VBF.sanitize && window.VBF.sanitize.escHtml) ? window.VBF.sanitize.escHtml(s) : String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                tr.innerHTML = '<td>' + escH(created) + '</td><td>' + escH(log.email) + '</td><td>' + escH(log.customer_name || '') + '</td><td>' + (log.plan_type === 'monthly' ? 'Havi' : 'Éves') + '</td><td>' + (log.amount_huf || 0) + ' Ft</td><td>' + escH(method) + '</td><td>' + escH(status) + '</td><td>' + actionCell + '</td>';
                const btn = tr.querySelector('button');
                if (btn) {
                    btn.addEventListener('click', async () => {
                        const id = btn.getAttribute('data-log-id');
                        if (!id || !confirm('Visszatérítés: a Stripe-ban refund történik és a hozzáférés visszavonásra kerül. Folytatod?')) return;
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
            const escH = (s) => (window.VBF && window.VBF.sanitize && window.VBF.sanitize.escHtml) ? window.VBF.sanitize.escHtml(s) : String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            listEl.innerHTML = '<p style="color:var(--text-muted);">Hiba: ' + escH(e.message) + '</p>';
        }
    };

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
        if (!confirm('Biztosan törölni szeretnéd ezt a felhasználót?')) return;
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
